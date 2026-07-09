import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Save, Send } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import type {
  MarketplaceListingStatus,
  ProductMarketplaceListing,
  ProductWorkflowItem,
} from '../types';
import type { User } from '../context/AuthContext';
import { Alert, Badge, Button, Input, Select, Spinner, Textarea } from './ui';

type ProductMarketplacePanelProps = {
  product: ProductWorkflowItem;
  currentUser?: User | null;
  onChanged: () => void;
};

type MarketplaceFormState = {
  status: MarketplaceListingStatus;
  sku: string;
  marketplaceArticle: string;
  marketplaceName: string;
  price: string;
  url: string;
  description: string;
};

const initialFormState: MarketplaceFormState = {
  status: 'placing',
  sku: '',
  marketplaceArticle: '',
  marketplaceName: '',
  price: '',
  url: '',
  description: '',
};

const statusOptions: Array<{ value: MarketplaceListingStatus; label: string }> = [
  { value: 'not_started', label: 'Не начато' },
  { value: 'placing', label: 'Размещение' },
  { value: 'moderation', label: 'Модерация' },
  { value: 'published', label: 'Опубликовано' },
  { value: 'in_sale', label: 'В продаже' },
  { value: 'blocked', label: 'Заблокировано' },
  { value: 'removed', label: 'Снято' },
];

function getErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    fallback
  );
}

function buildFormState(listing?: ProductMarketplaceListing | null): MarketplaceFormState {
  if (!listing) return initialFormState;

  return {
    status: listing.status || 'placing',
    sku: listing.sku || '',
    marketplaceArticle: listing.marketplaceArticle || '',
    marketplaceName: listing.marketplaceName || '',
    price: listing.price === null || listing.price === undefined ? '' : String(listing.price),
    url: listing.url || '',
    description: listing.description || '',
  };
}

export const ProductMarketplacePanel: React.FC<ProductMarketplacePanelProps> = ({
  product,
  currentUser,
  onChanged,
}) => {
  const [listing, setListing] = useState<ProductMarketplaceListing | null>(null);
  const [form, setForm] = useState<MarketplaceFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [error, setError] = useState('');

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'marketplace_manager';
  const priceNumber = Number(form.price);
  const isPlacementReady = useMemo(
    () =>
      form.status === 'published' &&
      form.sku.trim().length > 0 &&
      form.marketplaceName.trim().length > 0 &&
      Number.isFinite(priceNumber) &&
      priceNumber > 0,
    [form.marketplaceName, form.sku, form.status, priceNumber]
  );

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${product.id}/marketplaces`);
      const listings: ProductMarketplaceListing[] = response.data.data.listings || [];
      const kaspiListing = listings.find((item) => item.marketplace === 'kaspi') || null;
      setListing(kaspiListing);
      setForm(buildFormState(kaspiListing));
      setError('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Не удалось загрузить данные Kaspi'));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const updateField = <K extends keyof MarketplaceFormState>(
    field: K,
    value: MarketplaceFormState[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const payload = {
        marketplace: 'kaspi',
        status: form.status,
        sku: form.sku.trim() || null,
        marketplaceArticle: form.marketplaceArticle.trim() || null,
        marketplaceName: form.marketplaceName.trim() || null,
        price: form.price.trim() ? Number(form.price) : null,
        url: form.url.trim() || null,
        description: form.description.trim() || null,
      };

      const response = listing
        ? await api.put(`/products/${product.id}/marketplaces/${listing.id}`, payload)
        : await api.post(`/products/${product.id}/marketplaces`, payload);

      setListing(response.data.data.listing);
      setForm(buildFormState(response.data.data.listing));
      toast.success('Kaspi данные сохранены');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Не удалось сохранить Kaspi данные'));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReady = async () => {
    setError('');
    setMarkingReady(true);

    try {
      await api.post(`/products/${product.id}/lifecycle/mark-placement-ready`);
      toast.success('Товар передан в закуп');
      onChanged();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Не удалось передать товар в закуп'));
    } finally {
      setMarkingReady(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-text-muted">
        <Spinner size="sm" color="brand" />
        <span className="text-body">Загрузка Kaspi...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-caption text-text-muted">Товар</p>
          <h3 className="text-section-title text-brand-black">{product.name}</h3>
          <p className="mt-1 text-body text-text-muted">{product.article}</p>
        </div>
        <Badge variant="outline">Kaspi</Badge>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!canEdit && (
        <Alert variant="warning">
          Для вашей роли доступен только просмотр данных маркетплейса.
        </Alert>
      )}

      <div className="rounded-xl border border-border-subtle bg-surface-muted p-3 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Статус"
            value={form.status}
            onChange={(event) =>
              updateField('status', event.target.value as MarketplaceListingStatus)
            }
            disabled={!canEdit}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            label="SKU Kaspi"
            value={form.sku}
            onChange={(event) => updateField('sku', event.target.value)}
            disabled={!canEdit}
            placeholder="Например, PKS-001"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Название на Kaspi"
            value={form.marketplaceName}
            onChange={(event) => updateField('marketplaceName', event.target.value)}
            disabled={!canEdit}
          />

          <Input
            label="Цена продажи"
            type="number"
            min="0"
            step="1"
            value={form.price}
            onChange={(event) => updateField('price', event.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Артикул площадки"
            value={form.marketplaceArticle}
            onChange={(event) => updateField('marketplaceArticle', event.target.value)}
            disabled={!canEdit}
          />

          <Input
            label="Ссылка на карточку"
            value={form.url}
            onChange={(event) => updateField('url', event.target.value)}
            disabled={!canEdit}
            placeholder="https://kaspi.kz/..."
          />
        </div>

        <Textarea
          label="Описание / заметки"
          rows={4}
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          disabled={!canEdit}
          className="resize-none"
        />

        {form.url.trim() && (
          <a
            href={form.url.trim()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-caption font-medium text-brand-black hover:text-brand-yellow-dark"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Открыть карточку
          </a>
        )}
      </div>

      <Alert variant={isPlacementReady ? 'success' : 'info'}>
        Для передачи в закуп нужны статус "Опубликовано", SKU, название и цена больше 0.
      </Alert>

      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            leftIcon={Save}
            loading={saving}
            disabled={saving || markingReady}
            onClick={handleSave}
          >
            Сохранить
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={Send}
            loading={markingReady}
            disabled={saving || markingReady || !isPlacementReady}
            onClick={handleMarkReady}
          >
            Передать в закуп
          </Button>
        </div>
      )}
    </div>
  );
};
