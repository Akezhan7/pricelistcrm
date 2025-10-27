import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Save, X, MapPin, Palette, Hash } from 'lucide-react';
import { Sector } from '../types';
import { sectorsApi } from '../services/sectorsApi';

interface SectorFormData {
  name: string;
  code: string;
  productType: string;
  color: string;
  icon: string;
  description: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  sortOrder: number;
}

const INITIAL_FORM_DATA: SectorFormData = {
  name: '',
  code: '',
  productType: '',
  color: '#6b7280',
  icon: '📦',
  description: '',
  sortOrder: 0,
};

const PRODUCT_TYPES = [
  'Игрушки',
  'Стройматериалы', 
  'Посуда',
  'Текстиль',
  'Электроника',
  'Косметика',
  'Автотовары',
  'Продукты',
  'Бытовая химия',
  'Спорт'
];

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#374151', // dark gray
];

const SECTOR_ICONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

export const SectorManager: React.FC = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [formData, setFormData] = useState<SectorFormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    try {
      setLoading(true);
      const data = await sectorsApi.getAll();
      setSectors(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки секторов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSector = () => {
    setEditingSector(null);
    setFormData(INITIAL_FORM_DATA);
    setShowForm(true);
  };

  const handleEditSector = (sector: Sector) => {
    setEditingSector(sector);
    setFormData({
      name: sector.name,
      code: sector.code,
      productType: sector.productType,
      color: sector.color,
      icon: sector.icon || '📦',
      description: sector.description || '',
      position: sector.position,
      sortOrder: sector.sortOrder,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSector(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.productType.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    
    try {
      if (editingSector) {
        await sectorsApi.update(editingSector.id, formData);
      } else {
        await sectorsApi.create(formData);
      }
      
      await loadSectors();
      handleCloseForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения сектора');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSector = async (sector: Sector) => {
    if (!confirm(`Удалить сектор "${sector.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await sectorsApi.delete(sector.id);
      await loadSectors();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления сектора');
    }
  };

  const handleInputChange = (field: keyof SectorFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка секторов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Управление секторами</h1>
              <p className="text-gray-600">Создание и настройка складских секторов</p>
            </div>
            
            <button
              onClick={handleCreateSector}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Создать сектор
            </button>
          </div>

          {/* Статистика */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              📦 Всего секторов: <span className="font-semibold">{sectors.length}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              ✅ Активных: <span className="font-semibold">{sectors.filter(s => s.isActive).length}</span>
            </div>
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Список секторов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {sectors.map((sector) => (
            <div
              key={sector.id}
              className={`bg-white rounded-lg shadow-sm border p-6 ${
                !sector.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Заголовок сектора */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-xl"
                  style={{ backgroundColor: sector.color }}
                >
                  {sector.icon || '📦'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{sector.name}</h3>
                  <p className="text-sm text-gray-600">Код: {sector.code}</p>
                  <p className="text-xs text-gray-500">{sector.productType}</p>
                </div>
              </div>

              {/* Описание */}
              {sector.description && (
                <p className="text-sm text-gray-600 mb-4">{sector.description}</p>
              )}

              {/* Информация */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Рядов:</span>
                  <span className="font-medium">{sector.rowsCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Поставщиков:</span>
                  <span className="font-medium">{sector.suppliers?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Порядок:</span>
                  <span className="font-medium">{sector.sortOrder}</span>
                </div>
              </div>

              {/* Действия */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditSector(sector)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Редактировать
                </button>
                <button
                  onClick={() => handleDeleteSector(sector)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Форма создания/редактирования */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingSector ? 'Редактировать сектор' : 'Создать сектор'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
                {/* Основная информация */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Сектор A"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Код *
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="A"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Тип продукции */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип продукции *
                  </label>
                  <select
                    value={formData.productType}
                    onChange={(e) => handleInputChange('productType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите тип продукции</option>
                    {PRODUCT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Цвет и иконка */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Цвет
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleInputChange('color', color)}
                            className={`w-8 h-8 rounded-lg border-2 ${
                              formData.color === color ? 'border-gray-800' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className="w-full h-10 rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Иконка
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {SECTOR_ICONS.map(icon => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => handleInputChange('icon', icon)}
                            className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl ${
                              formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => handleInputChange('icon', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="📦"
                      />
                    </div>
                  </div>
                </div>

                {/* Описание */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Описание сектора..."
                  />
                </div>

                {/* Порядок сортировки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Порядок сортировки
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Кнопки */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {submitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
