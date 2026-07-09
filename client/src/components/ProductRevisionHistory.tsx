import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import type { ProductRevisionRequest } from '../types';
import { Alert, Badge, Spinner } from './ui';

type ProductRevisionHistoryProps = {
  productId: number;
  refreshKey?: number;
};

const revisionStatusLabels: Record<string, string> = {
  open: 'Открыта',
  resolved: 'Исправлена',
  cancelled: 'Отменена',
};

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export const ProductRevisionHistory: React.FC<ProductRevisionHistoryProps> = ({
  productId,
  refreshKey = 0,
}) => {
  const [items, setItems] = useState<ProductRevisionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/products/${productId}/revisions`);
      setItems(response.data.data.revisionRequests || []);
      setError('');
    } catch {
      setError('Не удалось загрузить историю доработок');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle p-5 text-text-muted">
        <Spinner size="sm" color="brand" />
        <span className="text-body">Загрузка истории...</span>
      </div>
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-inset p-4 text-body text-text-muted">
        Истории доработок пока нет.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-brand-white overflow-hidden">
      <div className="border-b border-border-subtle px-3 py-2.5">
        <h4 className="text-body-medium text-brand-black">История доработок</h4>
      </div>
      <div className="divide-y divide-border-subtle">
        {items.map((item) => (
          <article key={item.id} className="p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-body-medium text-brand-black">
                  {item.requester?.name || 'Руководитель'}
                </p>
                <p className="text-caption text-text-muted">{formatDate(item.createdAt)}</p>
              </div>
              <Badge variant="outline">{revisionStatusLabels[item.status] || item.status}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-body text-brand-black">{item.comment}</p>

            {item.attachments && item.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {item.attachments.map((asset) => {
                  const assetUrl = getImageUrl(asset.filePath) || asset.filePath;
                  return (
                    <a
                      key={asset.id}
                      href={assetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-body text-brand-black hover:bg-brand-white"
                    >
                      {asset.mimeType?.startsWith('image/') ? (
                        <Download className="h-4 w-4 text-text-muted" aria-hidden />
                      ) : (
                        <FileText className="h-4 w-4 text-text-muted" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {asset.originalName || asset.filePath}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
