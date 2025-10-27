import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Save, X, ArrowLeft, Users, Package2 } from 'lucide-react';
import { Row, Sector } from '../types';
import { rowsApi } from '../services/rowsApi';
import { sectorsApi } from '../services/sectorsApi';

interface RowFormData {
  sectorId: number;
  name: string;
  code: string;
  totalSpaces: number;
  notes: string;
  sortOrder: number;
}

const INITIAL_FORM_DATA: RowFormData = {
  sectorId: 0,
  name: '',
  code: '',
  totalSpaces: 0,
  notes: '',
  sortOrder: 0,
};

interface RowManagerProps {
  selectedSectorId?: number;
  onBack?: () => void;
}

export const RowManager: React.FC<RowManagerProps> = ({ selectedSectorId, onBack }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [formData, setFormData] = useState<RowFormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [selectedSectorId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Загружаем сектора
      const sectorsData = await sectorsApi.getAll();
      setSectors(sectorsData);

      // Если указан конкретный сектор
      if (selectedSectorId) {
        const sector = sectorsData.find(s => s.id === selectedSectorId);
        setSelectedSector(sector || null);
        
        if (sector) {
          const rowsData = await rowsApi.getAll(selectedSectorId);
          setRows(rowsData);
        }
      } else {
        // Загружаем все ряды
        const rowsData = await rowsApi.getAll();
        setRows(rowsData);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadRows = async (sectorId?: number) => {
    try {
      const data = await rowsApi.getAll(sectorId);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки рядов');
    }
  };

  const handleSectorChange = async (sectorId: number) => {
    const sector = sectors.find(s => s.id === sectorId);
    setSelectedSector(sector || null);
    
    if (sectorId > 0) {
      await loadRows(sectorId);
    } else {
      await loadRows();
    }
  };

  const handleCreateRow = () => {
    setEditingRow(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      sectorId: selectedSector?.id || 0,
    });
    setShowForm(true);
  };

  const handleEditRow = (row: Row) => {
    setEditingRow(row);
    setFormData({
      sectorId: row.sectorId,
      name: row.name,
      code: row.code,
      totalSpaces: row.totalSpaces,
      notes: row.notes || '',
      sortOrder: row.sortOrder,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRow(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sectorId || !formData.name.trim() || !formData.code.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    setSubmitting(true);
    
    try {
      if (editingRow) {
        await rowsApi.update(editingRow.id, formData);
      } else {
        await rowsApi.create(formData);
      }
      
      await loadRows(selectedSector?.id);
      handleCloseForm();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения ряда');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRow = async (row: Row) => {
    if (!confirm(`Удалить ряд "${row.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await rowsApi.delete(row.id);
      await loadRows(selectedSector?.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления ряда');
    }
  };

  const handleUpdateOccupancy = async (row: Row) => {
    try {
      await rowsApi.updateOccupancy(row.id);
      await loadRows(selectedSector?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления заполненности');
    }
  };

  const handleInputChange = (field: keyof RowFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getOccupancyPercentage = (row: Row) => {
    if (row.totalSpaces === 0) return 0;
    return Math.round((row.occupiedSpaces / row.totalSpaces) * 100);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-orange-600 bg-orange-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка рядов...</p>
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
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Управление рядами</h1>
                <p className="text-gray-600">
                  {selectedSector ? `Ряды сектора "${selectedSector.name}"` : 'Все ряды складских секторов'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleCreateRow}
              disabled={!selectedSector}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Создать ряд
            </button>
          </div>

          {/* Фильтр по секторам */}
          {!selectedSectorId && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фильтр по сектору:
              </label>
              <select
                value={selectedSector?.id || 0}
                onChange={(e) => handleSectorChange(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Все сектора</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>
                    {sector.icon} {sector.name} ({sector.productType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Статистика */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              📏 Всего рядов: <span className="font-semibold">{rows.length}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              ✅ Активных: <span className="font-semibold">{rows.filter(r => r.isActive).length}</span>
            </div>
            {selectedSector && (
              <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
                🏷️ Сектор: <span className="font-semibold">{selectedSector.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Список рядов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`bg-white rounded-lg shadow-sm border p-6 ${
                !row.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Заголовок ряда */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: row.sector?.color || '#6b7280' }}
                >
                  {row.code}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{row.name}</h3>
                  <p className="text-sm text-gray-600">
                    {row.sector?.name} ({row.sector?.productType})
                  </p>
                </div>
              </div>

              {/* Заполненность */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Заполненность:</span>
                  <span className="font-medium">
                    {row.occupiedSpaces} / {row.totalSpaces}
                  </span>
                </div>
                
                {row.totalSpaces > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getOccupancyPercentage(row)}%` }}
                    ></div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${getOccupancyColor(getOccupancyPercentage(row))}`}>
                    {getOccupancyPercentage(row)}%
                  </span>
                  <button
                    onClick={() => handleUpdateOccupancy(row)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Обновить
                  </button>
                </div>
              </div>

              {/* Заметки */}
              {row.notes && (
                <p className="text-sm text-gray-600 mb-4">{row.notes}</p>
              )}

              {/* Информация */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Поставщиков:</span>
                  <span className="font-medium">{row.suppliers?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Порядок:</span>
                  <span className="font-medium">{row.sortOrder}</span>
                </div>
              </div>

              {/* Действия */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditRow(row)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Редактировать
                </button>
                <button
                  onClick={() => handleDeleteRow(row)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Пустое состояние */}
        {rows.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedSector ? 'Нет рядов в этом секторе' : 'Нет созданных рядов'}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedSector 
                ? 'Создайте первый ряд в этом секторе для организации пространства'
                : 'Создайте первые ряды для организации складского пространства'
              }
            </p>
            <button
              onClick={handleCreateRow}
              disabled={!selectedSector && sectors.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              Создать ряд
            </button>
          </div>
        )}

        {/* Форма создания/редактирования */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingRow ? 'Редактировать ряд' : 'Создать ряд'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                {/* Сектор */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Сектор *
                  </label>
                  <select
                    value={formData.sectorId}
                    onChange={(e) => handleInputChange('sectorId', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!selectedSector}
                  >
                    <option value={0}>Выберите сектор</option>
                    {sectors.map(sector => (
                      <option key={sector.id} value={sector.id}>
                        {sector.icon} {sector.name} ({sector.productType})
                      </option>
                    ))}
                  </select>
                </div>

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
                      placeholder="Ряд 1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Код *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                {/* Дополнительная информация */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Всего мест
                    </label>
                    <input
                      type="number"
                      value={formData.totalSpaces}
                      onChange={(e) => handleInputChange('totalSpaces', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>

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
                </div>

                {/* Заметки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Заметки
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Дополнительная информация о ряде..."
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
