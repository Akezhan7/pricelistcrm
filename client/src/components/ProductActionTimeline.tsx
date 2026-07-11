import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  History,
  Image,
  Megaphone,
  PackageCheck,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from 'lucide-react';
import productsApi from '../services/productsApi';
import type { ProductHistoryEvent } from '../types';
import { getProductLifecycleLabel } from '../constants/productLifecycle';
import { formatPriceKZT } from '../utils/format';
import getImageUrl from '../utils/image';
import { Alert, Badge, Button, Spinner } from './ui';

type ProductActionTimelineProps = {
  productId: number;
};

const EVENT_LABELS: Record<string, string> = {
  product_created: 'Товар создан',
  product_updated: 'Карточка обновлена',
  product_archived: 'Товар архивирован',
  designer_assigned: 'Назначен дизайнер',
  content_uploaded: 'Материал загружен',
  content_asset_deleted: 'Материал удалён',
  content_created: 'Контент подготовлен',
  submitted_for_review: 'Передано на проверку',
  revision_requested: 'Отправлено на доработку',
  revision_resubmitted: 'Доработка отправлена повторно',
  approved: 'Карточка одобрена',
  marketplace_updated: 'Маркетплейс обновлён',
  marketplace_placement_ready: 'Размещение завершено',
  supplier_linked: 'Поставщик добавлен',
  supplier_updated: 'Данные поставщика обновлены',
  supplier_unlinked: 'Поставщик удалён',
  purchase_marked: 'Закуп подтверждён',
  warehouse_arrival_marked: 'Товар поступил на склад',
  warehouse_completed: 'Складской паспорт заполнен',
  stock_updated: 'Порог остатка обновлён',
  stock_changed: 'Остаток изменён',
  cost_price_changed: 'Себестоимость изменена',
  selling_price_changed: 'Цена продажи изменена',
  sale_launch_completed: 'Запуск продаж завершён',
  sale_flags_updated: 'Параметры продаж обновлены',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Название',
  article: 'Артикул',
  internalName: 'Внутреннее название',
  categoryId: 'Категория',
  description: 'Описание',
  image: 'Изображение',
  minStock: 'Минимальный остаток',
  supplierPrice: 'Цена поставщика',
  quantity: 'Количество',
  isAvailable: 'Доступность',
  notes: 'Примечание',
};

const categoryIcons = {
  product: FileText,
  content: Image,
  review: ClipboardCheck,
  marketplace: Store,
  supplier: Truck,
  purchase: ShoppingCart,
  warehouse: PackageCheck,
  price: CircleDollarSign,
  stock: Boxes,
  sale: Megaphone,
} as const;

function formatDateKey(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function EventDetails({ event }: { event: ProductHistoryEvent }) {
  const metadata = event.metadata || {};
  const changedFields = Array.isArray(metadata.changedFields)
    ? metadata.changedFields.filter((field): field is string => typeof field === 'string')
    : [];
  const changes = asRecord(metadata.changes);

  return (
    <div className="mt-2 space-y-2 text-caption text-text-muted">
      {event.source === 'price' && (
        <p>
          {formatPriceKZT(metadata.oldPrice as number)} → {formatPriceKZT(metadata.newPrice as number)}
        </p>
      )}
      {event.source === 'stock' && (
        <p>
          Остаток: {String(metadata.oldStock ?? 0)} → {String(metadata.newStock ?? 0)}
        </p>
      )}
      {changedFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {changedFields.map((field) => {
            const change = asRecord(changes[field]);
            const hasValues = 'from' in change || 'to' in change;
            return (
              <Badge key={field} variant="outline">
                {FIELD_LABELS[field] || field}
                {hasValues ? `: ${String(change.from ?? '—')} → ${String(change.to ?? '—')}` : ''}
              </Badge>
            );
          })}
        </div>
      )}
      {event.revision && (
        <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-inset p-3">
          <p className="text-body text-brand-black">{event.revision.comment}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={event.revision.status === 'resolved' ? 'success' : 'warning'}>
              {event.revision.status === 'resolved' ? 'Исправлено' : 'Открыто'}
            </Badge>
            {event.revision.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={getImageUrl(attachment.filePath) || attachment.filePath}
                target="_blank"
                rel="noreferrer"
                className="text-brand-black underline decoration-border-strong underline-offset-2"
              >
                {attachment.originalName || 'Вложение'}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const ProductActionTimeline: React.FC<ProductActionTimelineProps> = ({ productId }) => {
  const [events, setEvents] = useState<ProductHistoryEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadPage = useCallback(async (nextPage: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const result = await productsApi.getProductHistory(productId, nextPage, 30);
      setEvents((current) => append ? [...current, ...result.events] : result.events);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setError('');
    } catch (loadError) {
      const message = (loadError as Error)?.message || 'Не удалось загрузить историю товара';
      setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [productId]);

  useEffect(() => {
    setEvents([]);
    setPage(1);
    setTotalPages(1);
    loadPage(1, false);
  }, [loadPage]);

  const groups = useMemo(() => {
    const grouped: Array<{ date: string; events: ProductHistoryEvent[] }> = [];
    for (const event of events) {
      const date = formatDateKey(event.occurredAt);
      const last = grouped[grouped.length - 1];
      if (last?.date === date) last.events.push(event);
      else grouped.push({ date, events: [event] });
    }
    return grouped;
  }, [events]);

  if (loading) {
    return <div className="flex min-h-56 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (error && events.length === 0) return <Alert variant="error">{error}</Alert>;

  if (events.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center">
        <History className="h-8 w-8 text-text-muted" aria-hidden />
        <p className="text-body-medium text-brand-black">История пока пуста</p>
        <p className="text-caption text-text-muted">Новые действия появятся здесь автоматически.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="mb-3 text-caption font-semibold text-text-muted">{group.date}</h3>
          <div className="relative space-y-0 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-border-subtle">
            {group.events.map((event) => {
              const EventIcon = categoryIcons[event.category as keyof typeof categoryIcons] || BadgeCheck;
              return (
                <article key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                  <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-brand-white">
                    <EventIcon className="h-4 w-4 text-brand-black" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-body-medium text-brand-black">
                          {EVENT_LABELS[event.actionType] || event.actionType}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" aria-hidden />
                            {event.actor?.name || 'Система'}
                          </span>
                          <span>{formatTime(event.occurredAt)}</span>
                        </div>
                      </div>
                      {event.fromStatus && event.toStatus && event.fromStatus !== event.toStatus && (
                        <Badge variant="outline">
                          {getProductLifecycleLabel(event.fromStatus)} → {getProductLifecycleLabel(event.toStatus)}
                        </Badge>
                      )}
                    </div>
                    <EventDetails event={event} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {page < totalPages && (
        <div className="flex justify-center border-t border-border-subtle pt-4">
          <Button
            variant="secondary"
            loading={loadingMore}
            onClick={() => loadPage(page + 1, true)}
          >
            Показать ещё
          </Button>
        </div>
      )}
    </div>
  );
};
