import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2 } from 'lucide-react';
import { Market } from '../types';
import api from '../utils/api';

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
      alert('Укажите название рынка');
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
      alert(err.response?.data?.message || 'Ошибка сохранения рынка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (marketId: number) => {
    if (!window.confirm('Удалить этот рынок? Поставщики на этом рынке останутся без привязки.')) {
      return;
    }

    try {
      await api.delete(`/markets/${marketId}`);
      await loadMarkets();
      onMarketsUpdated();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка удаления рынка');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            Управление рынками
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Форма добавления/редактирования */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-900">
              {editingMarket ? 'Редактировать рынок' : 'Добавить новый рынок'}
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название рынка <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Байсат, Ялянь"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес рынка
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Например: мкр. Жулдыз, ул. Толе би"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Дополнительная информация о рынке..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : editingMarket ? 'Обновить' : 'Добавить'}
              </button>
              {editingMarket && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена редактирования
                </button>
              )}
            </div>
          </div>

          {/* Список существующих рынков */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Существующие рынки</h4>
            {loading ? (
              <div className="text-sm text-gray-500">Загрузка...</div>
            ) : markets.length === 0 ? (
              <p className="text-sm text-gray-500">Рынков пока нет</p>
            ) : (
              <div className="space-y-2">
                {markets.map((market) => (
                  <div
                    key={market.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{market.name}</h5>
                      {market.address && (
                        <p className="text-sm text-gray-600">{market.address}</p>
                      )}
                      {market.description && (
                        <p className="text-xs text-gray-500 mt-1">{market.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-4">
                      <button
                        type="button"
                        onClick={() => handleEdit(market)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(market.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Футер */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
