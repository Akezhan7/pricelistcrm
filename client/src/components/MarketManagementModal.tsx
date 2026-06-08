import React, { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Market } from '../types';
import api from '../utils/api';
import { toast } from '../context/ToastContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { Modal } from './ui/Modal';
import { FormFooter } from './ui/FormFooter';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Card, CardBody, CardTitle } from './ui/Card';
import { Spinner } from './ui/Spinner';

type MarketManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onMarketsUpdated: () => void;
};

export const MarketManagementModal: React.FC<MarketManagementModalProps> = ({
  isOpen,
  onClose,
  onMarketsUpdated,
}) => {
  const { confirm } = useConfirmDialog();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMarkets();
    }
  }, [isOpen]);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/markets');
      setMarkets(response.data.data.markets || []);
    } catch (err) {
      console.error('Ошибка загрузки рынков:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (market: Market) => {
    setEditingMarket(market);
    setFormData({
      name: market.name,
      address: market.address || '',
      description: market.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingMarket(null);
    setFormData({ name: '', address: '', description: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.warning('Укажите название рынка');
      return;
    }

    setSaving(true);
    try {
      if (editingMarket) {
        await api.put(`/markets/${editingMarket.id}`, formData);
      } else {
        await api.post('/markets', formData);
      }
      await loadMarkets();
      onMarketsUpdated();
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка сохранения рынка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (marketId: number) => {
    const ok = await confirm({
      title: 'Удалить рынок',
      message: 'Удалить этот рынок? Поставщики на этом рынке останутся без привязки.',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.delete(`/markets/${marketId}`);
      await loadMarkets();
      onMarketsUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка удаления рынка');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Управление рынками"
      size="lg"
      elevated
      footer={<FormFooter onCancel={onClose} cancelLabel="Закрыть" showSubmit={false} />}
    >
      <div className="space-y-6">
        <Card variant="inset">
          <CardBody>
            <p className="text-label uppercase tracking-wider text-text-muted mb-4">
              {editingMarket ? 'Редактировать рынок' : 'Добавить новый рынок'}
            </p>
            <div className="space-y-4">
              <Input
                label="Название рынка"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Байсат, Ялянь"
              />
              <Input
                label="Адрес рынка"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Например: мкр. Жулдыз, ул. Толе би"
              />
              <Textarea
                label="Описание"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация о рынке..."
                className="resize-none"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" onClick={handleSave} loading={saving} disabled={saving}>
                  {editingMarket ? 'Обновить' : 'Добавить'}
                </Button>
                {editingMarket && (
                  <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                    Отмена редактирования
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <p className="text-label uppercase tracking-wider text-text-muted">Существующие рынки</p>
          {loading ? (
            <div className="flex items-center gap-2 text-caption text-text-muted py-4">
              <Spinner size="sm" />
              Загрузка...
            </div>
          ) : markets.length === 0 ? (
            <p className="text-caption text-text-muted">Рынков пока нет</p>
          ) : (
            <div className="space-y-2">
              {markets.map((market) => (
                <Card key={market.id} variant="elevated">
                  <CardBody compact className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle>{market.name}</CardTitle>
                      {market.address && (
                        <p className="text-caption text-text-muted mt-0.5">{market.address}</p>
                      )}
                      {market.description && (
                        <p className="text-caption text-text-muted mt-1">{market.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <IconButton
                        icon={Edit2}
                        title="Редактировать"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(market)}
                      />
                      <IconButton
                        icon={Trash2}
                        title="Удалить"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(market.id)}
                        className="text-danger hover:text-danger-dark hover:bg-danger-light/50"
                      />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
