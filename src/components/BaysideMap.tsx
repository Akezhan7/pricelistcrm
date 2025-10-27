import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Package, Camera, Grid3x3, Map, Eye, EyeOff, Search, ZoomIn, ZoomOut, Settings, ArrowLeft, Users, Package2, X } from 'lucide-react';
import { Supplier, Sector, Row } from '../types';
import { sectorsApi } from '../services/sectorsApi';
import { rowsApi } from '../services/rowsApi';
import getImageUrl from '../utils/image';

type BaysideMapProps = {
  suppliers: Supplier[];
};

type MapMode = 'overview' | 'sector' | 'row';

interface ViewState {
  mode: MapMode;
  selectedSector: Sector | null;
  selectedRow: Row | null;
  zoom: number;
  panX: number;
  panY: number;
}

interface SectorInfo {
  name: string;
  color: string;
  icon: string;
  description: string;
}

const SECTOR_CONFIG: Record<string, SectorInfo> = {
  'Игрушки': { name: 'Игрушки', color: 'bg-pink-500', icon: '', description: 'Детские игрушки и развлечения' },
  'Стройматериалы': { name: 'Стройматериалы', color: 'bg-orange-500', icon: '', description: 'Строительные материалы и инструменты' },
  'Посуда': { name: 'Посуда', color: 'bg-blue-500', icon: '', description: 'Кухонная посуда и принадлежности' },
  'Текстиль': { name: 'Текстиль', color: 'bg-purple-500', icon: '', description: 'Ткани, одежда, постельное белье' },
  'Электроника': { name: 'Электроника', color: 'bg-green-500', icon: '', description: 'Электроника и аксессуары' },
  'Косметика': { name: 'Косметика', color: 'bg-rose-500', icon: '', description: 'Косметика и парфюмерия' },
  'Автотовары': { name: 'Автотовары', color: 'bg-gray-700', icon: '', description: 'Автозапчасти и аксессуары' },
  'Продукты': { name: 'Продукты', color: 'bg-yellow-500', icon: '', description: 'Продукты питания' },
  'Бытовая химия': { name: 'Бытовая химия', color: 'bg-cyan-500', icon: '', description: 'Чистящие средства' },
  'Спорт': { name: 'Спорт', color: 'bg-red-500', icon: '', description: 'Спортивные товары' },
  'Не определен': { name: 'Не определен', color: 'bg-gray-400', icon: '', description: 'Сектор не указан' }
};

export const BaysideMap: React.FC<BaysideMapProps> = ({ suppliers }) => {
  const [viewMode, setViewMode] = useState<'sectors' | 'map'>('sectors');
  const [showImages, setShowImages] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [highlightedItems, setHighlightedItems] = useState<{
    sectors: number[];
    rows: number[];
    suppliers: number[];
  }>({ sectors: [], rows: [], suppliers: [] });
  
  const [viewState, setViewState] = useState<ViewState>({
    mode: 'overview',
    selectedSector: null,
    selectedRow: null,
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    loadSectorsAndRows();
  }, []);
  
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    } else {
      setHighlightedItems({ sectors: [], rows: [], suppliers: [] });
    }
  }, [searchQuery, sectors, rows, suppliers]);
  
  const loadSectorsAndRows = async () => {
    try {
      setLoading(true);
      const [sectorsData, rowsData] = await Promise.all([
        sectorsApi.getAll(),
        rowsApi.getAll(),
      ]);
      setSectors(sectorsData);
      setRows(rowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };
  
  const performSearch = (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    const matchingSectors: number[] = [];
    const matchingRows: number[] = [];
    const matchingSuppliers: number[] = [];
    
    // Поиск по секторам
    sectors.forEach(sector => {
      if (
        sector.name.toLowerCase().includes(lowerQuery) ||
        sector.code.toLowerCase().includes(lowerQuery) ||
        sector.productType.toLowerCase().includes(lowerQuery)
      ) {
        matchingSectors.push(sector.id);
      }
    });
    
    // Поиск по рядам
    rows.forEach(row => {
      if (
        row.name.toLowerCase().includes(lowerQuery) ||
        row.code.toLowerCase().includes(lowerQuery)
      ) {
        matchingRows.push(row.id);
        // Добавляем сектор, к которому относится ряд
        if (!matchingSectors.includes(row.sectorId)) {
          matchingSectors.push(row.sectorId);
        }
      }
    });
    
    // Поиск по поставщикам
    suppliers.forEach(supplier => {
      if (
        supplier.name.toLowerCase().includes(lowerQuery) ||
        supplier.address.toLowerCase().includes(lowerQuery) ||
        supplier.phone.includes(lowerQuery)
      ) {
        matchingSuppliers.push(supplier.id);
        
        // Добавляем сектор и ряд, если они указаны
        if (supplier.sectorId && !matchingSectors.includes(supplier.sectorId)) {
          matchingSectors.push(supplier.sectorId);
        }
        if (supplier.rowId && !matchingRows.includes(supplier.rowId)) {
          matchingRows.push(supplier.rowId);
        }
      }
    });
    
    setHighlightedItems({
      sectors: matchingSectors,
      rows: matchingRows,
      suppliers: matchingSuppliers,
    });
  };
  
  const handleSectorClick = async (sector: Sector) => {
    try {
      const sectorRows = await rowsApi.getAll(sector.id);
      setRows(prevRows => {
        const newRows = [...prevRows];
        sectorRows.forEach(newRow => {
          const existingIndex = newRows.findIndex(r => r.id === newRow.id);
          if (existingIndex >= 0) {
            newRows[existingIndex] = newRow;
          } else {
            newRows.push(newRow);
          }
        });
        return newRows;
      });
      
      setViewState(prev => ({
        ...prev,
        mode: 'sector',
        selectedSector: sector,
        selectedRow: null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки рядов');
    }
  };
  
  const handleRowClick = (row: Row) => {
    setViewState(prev => ({
      ...prev,
      mode: 'row',
      selectedRow: row,
    }));
  };
  
  const handleBackToOverview = () => {
    setViewState({
      mode: 'overview',
      selectedSector: null,
      selectedRow: null,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  };
  
  const handleZoom = (delta: number) => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3, prev.zoom + delta)),
    }));
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewState.zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewState.panX, y: e.clientY - viewState.panY });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && viewState.zoom > 1) {
      setViewState(prev => ({
        ...prev,
        panX: e.clientX - dragStart.x,
        panY: e.clientY - dragStart.y,
      }));
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Вспомогательная функция: попытка спарсить "ряд" и "контейнер" из адреса
  const parseAddressForRowContainer = (address?: string) => {
    if (!address) return { row: undefined, container: undefined };
    const a = address.toLowerCase();
    let row: string | undefined;
    let container: string | undefined;

    const rowMatch = a.match(/ряд\s*[:\-]?\s*(\d+)/i) || a.match(/(\d+)\s*ряд/i);
    const contMatch = a.match(/контейн(?:ер|ерa)?\s*[:\-]?\s*(\d+)/i) || a.match(/(\d+)\s*контейн/i);

    if (rowMatch) row = rowMatch[1];
    if (contMatch) container = contMatch[1];

    return { row, container };
  };

  // Группировка: сектор -> ряд -> контейнер -> массив поставщиков
  const sectorsData = suppliers.reduce((acc, supplier) => {
    const sector = supplier.sector || 'Не определен';
    if (!acc[sector]) acc[sector] = {} as Record<string, Record<string, Supplier[]>>;

    const parsed = parseAddressForRowContainer(supplier.address);
    const rowKey = String(supplier.row ?? parsed.row ?? 'Не указан');
    const containerKey = String(supplier.container ?? parsed.container ?? 'Не указан');

    if (!acc[sector][rowKey]) acc[sector][rowKey] = {} as Record<string, Supplier[]>;
    if (!acc[sector][rowKey][containerKey]) acc[sector][rowKey][containerKey] = [];

    acc[sector][rowKey][containerKey].push(supplier);
    return acc;
  }, {} as Record<string, Record<string, Record<string, Supplier[]>>>);

  const sectorKeys = Object.keys(sectorsData);

  // Создание интерактивной карты с позициями
  const mapSuppliers = suppliers.filter(s => s.mapPosition && s.mapPosition.x && s.mapPosition.y);
  
  const renderSectorView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sectorKeys.map((sector) => {
          const config = SECTOR_CONFIG[sector] || SECTOR_CONFIG['Не определен'];
          const isSelected = selectedSector === sector;

        // подсчёт всех поставщиков в секторе
        const rows = sectorsData[sector] || {};
        const totalCount = Object.values(rows).reduce((acc: number, containers: Record<string, Supplier[]>) => {
          return acc + Object.values(containers).reduce((s, arr) => s + arr.length, 0);
        }, 0);

        return (
          <div
            key={sector}
            className={`card p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
            }`}
            onClick={() => setSelectedSector(isSelected ? null : sector)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-12 w-12 ${config.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {config.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                <p className="text-xs text-gray-500">{config.description}</p>
                <p className="text-sm text-gray-600 font-medium">{totalCount} поставщиков</p>
              </div>
            </div>

            <div className={`space-y-3 transition-all duration-200 ${isSelected ? 'max-h-96 overflow-y-auto' : 'max-h-32 overflow-hidden'}`}>
              {Object.keys(rows).map((rowKey) => (
                <div key={rowKey} className="mb-2">
                  <div className="text-sm font-medium text-gray-800 mb-1">Ряд: {rowKey}</div>
                  <div className="space-y-2">
                    {Object.keys(rows[rowKey]).map((containerKey) => (
                      <div key={containerKey} className="p-2 bg-gray-50 rounded-lg border">
                        <div className="text-xs text-gray-600 font-medium mb-2">Контейнер: {containerKey}</div>
                        <div className="space-y-2">
                          {rows[rowKey][containerKey].map((supplier) => (
                            <div key={supplier.id} className="p-2 bg-white rounded shadow-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                              </div>
                              <p className="text-xs text-gray-600 mb-1">{supplier.address}</p>
                              {showImages && supplier.containerImage && (
                                <img
                                  src={getImageUrl(supplier.containerImage) || undefined}
                                  alt={`Контейнер ${supplier.name}`}
                                  className="w-full h-20 object-cover rounded mt-1"
                                  onError={(e) => {
                                    const el = e.currentTarget;
                                    el.onerror = null;
                                    el.src = '/placeholder.svg';
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
  };

  // Новый интерактивный вид карты
  const renderInteractiveMapView = () => {
    return (
      <div className="space-y-4">
        {/* Панель поиска и управления */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Поиск */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по секторам, рядам, поставщикам..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  Найдено: {highlightedItems.sectors.length} секторов, {highlightedItems.rows.length} рядов, {highlightedItems.suppliers.length} поставщиков
                </div>
              )}
            </div>
            
            {/* Навигация по уровням */}
            <div className="flex items-center gap-2">
              {viewState.mode !== 'overview' && (
                <button
                  onClick={handleBackToOverview}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Обзор
                </button>
              )}
              {viewState.selectedSector && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: viewState.selectedSector.color }}
                  ></div>
                  {viewState.selectedSector.name}
                </div>
              )}
              {viewState.selectedRow && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-800 rounded-lg">
                  <Package2 className="h-4 w-4" />
                  {viewState.selectedRow.name}
                </div>
              )}
            </div>
            
            {/* Управление масштабом */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoom(-0.2)}
                disabled={viewState.zoom <= 0.5}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-12 text-center">
                {Math.round(viewState.zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.2)}
                disabled={viewState.zoom >= 3}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Интерактивная карта */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div
            ref={mapRef}
            className="relative bg-gradient-to-br from-blue-50 to-green-50 cursor-move"
            style={{ 
              minHeight: '700px',
              transform: `scale(${viewState.zoom}) translate(${viewState.panX}px, ${viewState.panY}px)`,
              transformOrigin: 'center center',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Координатная сетка */}
            <div className="absolute inset-0 opacity-10">
              {Array.from({length: 21}, (_, i) => (
                <div key={`v-${i}`} className="absolute border-l border-gray-400" 
                     style={{left: `${i * 5}%`, height: '100%'}} />
              ))}
              {Array.from({length: 16}, (_, i) => (
                <div key={`h-${i}`} className="absolute border-t border-gray-400" 
                     style={{top: `${i * 6.25}%`, width: '100%'}} />
              ))}
            </div>

            {/* Отображение секторов */}
            {viewState.mode === 'overview' && sectors.map(sector => {
              const isHighlighted = highlightedItems.sectors.includes(sector.id);
              return (
                <div
                  key={sector.id}
                  className={`absolute rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    isHighlighted ? 'ring-4 ring-yellow-400 ring-opacity-75 z-20' : ''
                  } hover:scale-105 hover:shadow-lg`}
                  style={{
                    backgroundColor: sector.color + '40',
                    borderColor: sector.color,
                    left: sector.position?.x ? `${sector.position.x}%` : `${15 + (sector.id * 20) % 70}%`,
                    top: sector.position?.y ? `${sector.position.y}%` : `${10 + (sector.id * 25) % 60}%`,
                    width: sector.position?.width ? `${sector.position.width}%` : '15%',
                    height: sector.position?.height ? `${sector.position.height}%` : '20%',
                    minWidth: '120px',
                    minHeight: '80px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSectorClick(sector);
                  }}
                >
                  <div className="p-3 h-full flex flex-col justify-center items-center text-center">
                    <div 
                      className="text-2xl mb-1 p-2 rounded-lg"
                      style={{ backgroundColor: sector.color }}
                    >
                      {sector.icon || '📦'}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{sector.name}</div>
                    <div className="text-xs text-gray-600">{sector.productType}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {sector.rowsCount || 0} рядов
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Отображение рядов внутри сектора */}
            {viewState.mode === 'sector' && viewState.selectedSector && (
              <div className="p-8">
                <div className="grid grid-cols-4 gap-4">
                  {rows
                    .filter(row => row.sectorId === viewState.selectedSector!.id)
                    .map(row => {
                      const isHighlighted = highlightedItems.rows.includes(row.id);
                      const occupancyPercent = row.totalSpaces > 0 
                        ? (row.occupiedSpaces / row.totalSpaces) * 100 
                        : 0;
                      
                      return (
                        <div
                          key={row.id}
                          className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all duration-300 ${
                            isHighlighted ? 'ring-4 ring-yellow-400 ring-opacity-75 z-20' : ''
                          } hover:shadow-lg hover:scale-105`}
                          style={{
                            borderColor: viewState.selectedSector!.color,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(row);
                          }}
                        >
                          <div className="text-center">
                            <div 
                              className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: viewState.selectedSector!.color }}
                            >
                              {row.code}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{row.name}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {row.occupiedSpaces}/{row.totalSpaces} мест
                            </div>
                            {row.totalSpaces > 0 && (
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {Math.round(occupancyPercent)}%
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            )}
            
            {/* Отображение поставщиков в ряду */}
            {viewState.mode === 'row' && viewState.selectedRow && (
              <div className="p-8">
                <div className="grid grid-cols-3 gap-4">
                  {suppliers
                    .filter(supplier => supplier.rowId === viewState.selectedRow!.id)
                    .map(supplier => {
                      const isHighlighted = highlightedItems.suppliers.includes(supplier.id);
                      
                      return (
                        <div
                          key={supplier.id}
                          className={`bg-white rounded-lg border p-4 transition-all duration-300 ${
                            isHighlighted ? 'ring-4 ring-yellow-400 ring-opacity-75 z-20' : ''
                          } hover:shadow-lg`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{supplier.name}</div>
                              <div className="text-xs text-gray-600">{supplier.address}</div>
                              <div className="text-xs text-gray-600">{supplier.phone}</div>
                            </div>
                          </div>
                          
                          {showImages && supplier.containerImage && (
                            <img
                              src={getImageUrl(supplier.containerImage) || undefined}
                              alt={`Контейнер ${supplier.name}`}
                              className="w-full h-24 object-cover rounded"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.onerror = null;
                                el.src = '/placeholder.svg';
                              }}
                            />
                          )}
                          
                          {supplier.debt > 0 && (
                            <div className="mt-2 text-xs text-red-600">
                              Долг: {supplier.debt} руб.
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
                {suppliers.filter(supplier => supplier.rowId === viewState.selectedRow!.id).length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Нет поставщиков в этом ряду
                    </h3>
                    <p className="text-gray-600">
                      В ряду "{viewState.selectedRow.name}" пока не размещено ни одного поставщика
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Сообщение для пустого состояния */}
            {viewState.mode === 'overview' && sectors.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-white rounded-lg p-8 shadow-lg">
                  <div className="text-6xl mb-4">🏗️</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Сектора не созданы
                  </h3>
                  <p className="text-gray-600">
                    Создайте сектора и ряды для организации<br />
                    складского пространства Bayside
                  </p>
                </div>
              </div>
            )}
            
            {/* Загрузка */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Загрузка карты...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Статус-бар */}
        <div className="bg-white rounded-lg shadow-sm border p-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex gap-6">
              <span>Режим: {
                viewState.mode === 'overview' ? 'Обзор секторов' :
                viewState.mode === 'sector' ? `Сектор "${viewState.selectedSector?.name}"` :
                viewState.mode === 'row' ? `Ряд "${viewState.selectedRow?.name}"` :
                'Неизвестно'
              }</span>
              <span>Масштаб: {Math.round(viewState.zoom * 100)}%</span>
            </div>
            
            {viewState.zoom > 1 && (
              <div className="text-xs text-gray-500">
                Перетаскивайте карту для навигации
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Карта Bayside</h1>
              <p className="text-gray-600">Расположение контейнеров поставщиков по секторам</p>
            </div>
            
            {/* Переключатели режима просмотра */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImages(!showImages)}
                  className={`p-2 rounded-lg transition-colors ${
                    showImages 
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={showImages ? 'Скрыть фотографии' : 'Показать фотографии'}
                >
                  {showImages ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
                <span className="text-sm text-gray-600">Фото</span>
              </div>
              
              <div className="flex bg-white rounded-lg p-1 shadow-sm border">
                <button
                  onClick={() => setViewMode('sectors')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'sectors'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4" />
                  Сектора
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Map className="h-4 w-4" />
                  Интерактивная карта
                </button>
              </div>
            </div>
          </div>
          
          {/* Статистика */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              Всего поставщиков: <span className="font-semibold">{suppliers.length}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              С позициями: <span className="font-semibold">{suppliers.filter(s => s.mapPosition).length}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              С фотографиями: <span className="font-semibold">{suppliers.filter(s => s.containerImage).length}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm border">
              Секторов: <span className="font-semibold">{sectors.length}</span>
            </div>
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Закрыть
            </button>
          </div>
        )}

        {/* Основной контент в зависимости от режима */}
        {viewMode === 'sectors' ? renderSectorView() : renderInteractiveMapView()}
        
      </div>
    </div>
  );
};
