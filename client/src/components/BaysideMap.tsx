import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Grid3x3, Map, Eye, EyeOff, Search, ZoomIn, ZoomOut, ArrowLeft, Users, Package2, X } from 'lucide-react';
import { Button, Card, CardBody, EmptyState, IconButton, Input, PageHeader, Spinner } from './ui';
import { cn } from '../utils/cn';
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
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadSectorsAndRows();
  }, []);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const rowMatch = a.match(/ряд\s*[:-]?\s*(\d+)/i) || a.match(/(\d+)\s*ряд/i);
    const contMatch = a.match(/контейн(?:ер|ерa)?\s*[:-]?\s*(\d+)/i) || a.match(/(\d+)\s*контейн/i);

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
            role="button"
            tabIndex={0}
            onClick={() => setSelectedSector(isSelected ? null : sector)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedSector(isSelected ? null : sector);
              }
            }}
            className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2"
          >
          <Card variant="interactive" selected={isSelected}>
            <CardBody>
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-xl text-white ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <h3 className="text-card-title text-brand-black">{config.name}</h3>
                <p className="text-caption text-text-muted">{config.description}</p>
                <p className="text-body-medium text-brand-black">{totalCount} поставщиков</p>
              </div>
            </div>

            <div className={cn('space-y-3 transition-all duration-fast', isSelected ? 'max-h-96 overflow-y-auto' : 'max-h-32 overflow-hidden')}>
              {Object.keys(rows).map((rowKey) => (
                <div key={rowKey} className="mb-2">
                  <div className="mb-1 text-body-medium text-brand-black">Ряд: {rowKey}</div>
                  <div className="space-y-2">
                    {Object.keys(rows[rowKey]).map((containerKey) => (
                      <div key={containerKey} className="rounded-lg border border-border-subtle bg-surface-inset p-2">
                        <div className="mb-2 text-caption font-medium text-text-muted">Контейнер: {containerKey}</div>
                        <div className="space-y-2">
                          {rows[rowKey][containerKey].map((supplier) => (
                            <div key={supplier.id} className="rounded-lg border border-border-subtle bg-brand-white p-2">
                              <div className="mb-1 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-text-muted" />
                                <span className="text-body-medium text-brand-black">{supplier.name}</span>
                              </div>
                              <p className="mb-1 text-caption text-text-muted">{supplier.address}</p>
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
            </CardBody>
          </Card>
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
        <Card variant="elevated" className="shadow-md">
          <CardBody className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-64 flex-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по секторам, рядам, поставщикам..."
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-black"
                      aria-label="Очистить поиск"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="mt-2 text-caption text-text-muted">
                    Найдено: {highlightedItems.sectors.length} секторов, {highlightedItems.rows.length} рядов, {highlightedItems.suppliers.length} поставщиков
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {viewState.mode !== 'overview' && (
                  <Button variant="secondary" size="sm" leftIcon={ArrowLeft} onClick={handleBackToOverview}>
                    Обзор
                  </Button>
                )}
                {viewState.selectedSector && (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-accent px-3 py-2 text-caption font-medium text-brand-black">
                    <span
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: viewState.selectedSector.color }}
                      aria-hidden
                    />
                    {viewState.selectedSector.name}
                  </span>
                )}
                {viewState.selectedRow && (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-caption font-medium text-brand-black">
                    <Package2 className="h-4 w-4 text-text-muted" />
                    {viewState.selectedRow.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-inset p-1">
                <IconButton
                  icon={ZoomOut}
                  title="Уменьшить"
                  size="sm"
                  onClick={() => handleZoom(-0.2)}
                  disabled={viewState.zoom <= 0.5}
                />
                <span className="min-w-12 text-center text-caption tabular-nums text-brand-black">
                  {Math.round(viewState.zoom * 100)}%
                </span>
                <IconButton
                  icon={ZoomIn}
                  title="Увеличить"
                  size="sm"
                  onClick={() => handleZoom(0.2)}
                  disabled={viewState.zoom >= 3}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Интерактивная карта */}
        <Card variant="elevated" className="overflow-hidden shadow-md">
          <div
            ref={mapRef}
            className="relative cursor-move bg-gradient-to-br from-surface-inset to-surface-page"
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
                <div key={`v-${i}`} className="absolute border-l border-border-subtle" 
                     style={{left: `${i * 5}%`, height: '100%'}} />
              ))}
              {Array.from({length: 16}, (_, i) => (
                <div key={`h-${i}`} className="absolute border-t border-border-subtle" 
                     style={{top: `${i * 6.25}%`, width: '100%'}} />
              ))}
            </div>

            {/* Отображение секторов */}
            {viewState.mode === 'overview' && sectors.map(sector => {
              const isHighlighted = highlightedItems.sectors.includes(sector.id);
              return (
                <div
                  key={sector.id}
                  className={cn(
                    'absolute z-10 cursor-pointer rounded-lg border-2 transition-all duration-150',
                    isHighlighted ? 'z-20 ring-2 ring-brand-yellow ring-offset-2' : '',
                    'hover:shadow-md'
                  )}
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
                    <div className="text-body-medium font-semibold text-brand-black">{sector.name}</div>
                    <div className="text-caption text-text-muted">{sector.productType}</div>
                    <div className="mt-1 text-caption text-text-muted">
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
                          className={cn(
                            'cursor-pointer rounded-lg border-2 bg-brand-white p-4 transition-all duration-150',
                            isHighlighted ? 'z-20 ring-2 ring-brand-yellow ring-offset-2' : '',
                            'hover:shadow-md'
                          )}
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
                            <div className="text-body-medium text-brand-black">{row.name}</div>
                            <div className="mt-1 text-caption text-text-muted">
                              {row.occupiedSpaces}/{row.totalSpaces} мест
                            </div>
                            {row.totalSpaces > 0 && (
                              <div className="mt-2">
                                <div className="h-2 w-full rounded-full bg-surface-inset">
                                  <div
                                    className="h-2 rounded-full bg-brand-yellow transition-all duration-150"
                                    style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                                  ></div>
                                </div>
                                <div className="mt-1 text-caption tabular-nums text-text-muted">
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
                          className={cn(
                            'rounded-lg border border-border-subtle bg-brand-white p-4 transition-all duration-150',
                            isHighlighted ? 'z-20 ring-2 ring-brand-yellow ring-offset-2' : '',
                            'hover:shadow-md'
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <MapPin className="h-5 w-5 shrink-0 text-text-muted" />
                            <div>
                              <div className="text-body-medium text-brand-black">{supplier.name}</div>
                              <div className="text-caption text-text-muted">{supplier.address}</div>
                              <div className="text-caption text-text-muted">{supplier.phone}</div>
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
                            <div className="mt-2 text-caption text-danger-dark">
                              Долг: {supplier.debt} ₸
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
                {suppliers.filter(supplier => supplier.rowId === viewState.selectedRow!.id).length === 0 && (
                  <EmptyState
                    icon={Users}
                    title="Нет поставщиков в этом ряду"
                    description={`В ряду «${viewState.selectedRow.name}» пока не размещено ни одного поставщика`}
                    className="py-12"
                  />
                )}
              </div>
            )}
            
            {/* Сообщение для пустого состояния */}
            {viewState.mode === 'overview' && sectors.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <EmptyState
                  title="Сектора не созданы"
                  description="Создайте сектора и ряды для организации складского пространства Plastkrep"
                  className="max-w-sm rounded-xl border border-border-subtle bg-brand-white p-8 shadow-md"
                />
              </div>
            )}
            
            {/* Загрузка */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-brand-white/80 backdrop-blur-sm">
                <div className="text-center">
                  <Spinner size="lg" color="brand" useLucide className="mx-auto mb-4" />
                  <p className="text-body text-text-muted">Загрузка карты...</p>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Статус-бар */}
        <Card variant="inset" className="shadow-none">
          <CardBody className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-4 text-caption text-text-muted">
              <span>
                Режим:{' '}
                <span className="text-brand-black">
                  {viewState.mode === 'overview'
                    ? 'Обзор секторов'
                    : viewState.mode === 'sector'
                      ? `Сектор «${viewState.selectedSector?.name}»`
                      : viewState.mode === 'row'
                        ? `Ряд «${viewState.selectedRow?.name}»`
                        : 'Неизвестно'}
                </span>
              </span>
              <span>
                Масштаб:{' '}
                <span className="tabular-nums text-brand-black">{Math.round(viewState.zoom * 100)}%</span>
              </span>
            </div>
            {viewState.zoom > 1 && (
              <p className="text-overline text-text-muted">Перетаскивайте карту для навигации</p>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  const statItems = [
    { label: 'Всего поставщиков', value: suppliers.length },
    { label: 'С позициями', value: suppliers.filter((s) => s.mapPosition).length },
    { label: 'С фотографиями', value: suppliers.filter((s) => s.containerImage).length },
    { label: 'Секторов', value: sectors.length },
  ];

  return (
    <div className="space-y-6">
        <div className="space-y-4">
          <PageHeader
            title="Карта Plastkrep"
            description="Расположение контейнеров поставщиков по секторам"
            icon={Map}
            actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <IconButton
                  icon={showImages ? Eye : EyeOff}
                  title={showImages ? 'Скрыть фотографии' : 'Показать фотографии'}
                  variant={showImages ? 'default' : 'ghost'}
                  onClick={() => setShowImages(!showImages)}
                />
                <span className="text-caption text-text-muted">Фото</span>
              </div>

              <div className="flex w-full rounded-xl border border-border-subtle bg-surface-inset p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('sectors')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-200 sm:text-body ${
                    viewMode === 'sectors'
                      ? 'bg-brand-yellow text-brand-black shadow-sm'
                      : 'text-text-muted hover:bg-brand-white hover:text-brand-black'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4" />
                  Сектора
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-200 sm:text-body ${
                    viewMode === 'map'
                      ? 'bg-brand-yellow text-brand-black shadow-sm'
                      : 'text-text-muted hover:bg-brand-white hover:text-brand-black'
                  }`}
                >
                  <Map className="h-4 w-4" />
                  Интерактивная карта
                </button>
              </div>
            </div>
            }
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statItems.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-border-subtle bg-brand-white px-4 py-3"
              >
                <p className="text-caption font-medium text-text-muted">{label}</p>
                <p className="mt-0.5 text-h2 font-bold tabular-nums tracking-tight text-brand-black">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-light p-4">
            <p className="text-body text-danger-dark">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="mt-2 text-danger-dark">
              Закрыть
            </Button>
          </div>
        )}

        {viewMode === 'sectors' ? renderSectorView() : renderInteractiveMapView()}
    </div>
  );
};
