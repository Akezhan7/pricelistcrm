import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Pagination,
  Spinner,
} from '../components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table';
import api from '../utils/api';
import { Product } from '../types';
import { useUI } from '../context/UIContext';
import { toast } from '../context/ToastContext';
import { Check, Download, RefreshCw, Search, Settings2, Tag, Table2 } from 'lucide-react';
import getImageUrl from '../utils/image';
import { calculatePriceListValue } from '../utils/pricing';
import { generatePriceListPDF, PriceListPdfItem } from '../utils/pdfGenerator';
import { formatPriceKZT } from '../utils/format';
import { cn } from '../utils/cn';

const PAGE_SIZE = 20;

type MobileTab = 'products' | 'settings' | 'preview';

interface ProductsPagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

const priceFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 } as const;

const MOBILE_TABS: { id: MobileTab; label: string; icon: typeof Tag }[] = [
  { id: 'products', label: 'Выбор товаров', icon: Tag },
  { id: 'settings', label: 'Настройки', icon: Settings2 },
  { id: 'preview', label: 'Превью', icon: Table2 },
];

export const PriceListPage: React.FC = () => {
  const { searchQuery, setSearchQuery } = useUI();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Map<number, Product>>(new Map());
  const [markupPercent, setMarkupPercent] = useState<number>(30);
  const [downloading, setDownloading] = useState(false);
  const [title, setTitle] = useState('ПРАЙС-ЛИСТ');
  const [mobileTab, setMobileTab] = useState<MobileTab>('products');
  const [pagination, setPagination] = useState<ProductsPagination>({
    total: 0,
    page: 1,
    pages: 1,
    limit: PAGE_SIZE,
  });
  const prevSearchRef = useRef(searchQuery);

  const fetchProducts = useCallback(async (page: number, search: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) {
        params.append('search', search.trim());
      }
      const res = await api.get(`/products?${params.toString()}`);
      const data = res.data.data;
      setProducts(data.products);
      const p = data.pagination;
      setPagination({
        total: p.total,
        page: p.page,
        pages: p.totalPages ?? p.pages ?? 1,
        limit: p.limit,
      });
    } catch (e) {
      console.error('Ошибка загрузки товаров:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const searchChanged = prevSearchRef.current !== searchQuery;
    prevSearchRef.current = searchQuery;

    if (searchChanged && pagination.page !== 1) {
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }

    fetchProducts(pagination.page, searchQuery);
  }, [pagination.page, searchQuery, fetchProducts]);

  const toggleSelect = (product: Product) => {
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.set(product.id, product);
      }
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedProducts((prev) => {
      const next = new Map(prev);
      products.forEach((p) => next.set(p.id, p));
      return next;
    });
  };

  const clearSelection = () => setSelectedProducts(new Map());

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleRefresh = () => {
    fetchProducts(pagination.page, searchQuery);
  };

  const selectedCount = selectedProducts.size;

  const items: PriceListPdfItem[] = useMemo(
    () =>
      Array.from(selectedProducts.values()).map((p) => ({
        article: p.article,
        name: p.name,
        image: p.image || null,
        costPrice: Number(p.costPrice) || 0,
        finalPrice: calculatePriceListValue(Number(p.costPrice) || 0, markupPercent),
      })),
    [selectedProducts, markupPercent]
  );

  const handleDownload = async () => {
    if (items.length === 0) return;
    try {
      setDownloading(true);
      await generatePriceListPDF(items, {
        title: title || 'ПРАЙС-ЛИСТ',
        markupPercent,
        roundedToFive: true,
      });
    } catch (e) {
      console.error(e);
      toast.error('Ошибка при формировании PDF');
    } finally {
      setDownloading(false);
    }
  };

  const showPanel = (panel: MobileTab) => mobileTab === panel;

  const productsPanel = (
    <Card className="flex h-full min-h-0 w-full flex-col">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-section-title text-brand-black">
            <Tag className="h-5 w-5 shrink-0 text-brand-yellow" aria-hidden />
            <span>Выбор товаров</span>
            {pagination.total > 0 && (
              <span className="text-caption font-normal text-text-muted">({pagination.total})</span>
            )}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button type="button" variant="ghost" size="sm" onClick={selectAllOnPage} title="Выбрать все на текущей странице">
              Все на странице
            </Button>
            <span className="text-border hidden sm:inline" aria-hidden>
              |
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection} title="Очистить выбор">
              Очистить
            </Button>
            <IconButton icon={RefreshCw} title="Обновить" size="md" onClick={handleRefresh} />
          </div>
        </div>
      </CardHeader>

      <div className="border-b border-border-subtle bg-surface-inset px-4 py-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none"
            aria-hidden
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Название, артикул или код товара..."
            className="pl-10 text-sm"
            aria-label="Поиск по названию, артикулу или коду товара"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" color="brand" useLucide />
          </div>
        ) : products.length === 0 ? (
          <EmptyState title="Товары не найдены" className="py-8" />
        ) : (
          <div>
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              const final = calculatePriceListValue(Number(product.costPrice) || 0, markupPercent);
              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => toggleSelect(product)}
                  className={cn(
                    'flex min-h-[64px] w-full items-start gap-3 border-b border-border-subtle p-3 text-left transition-colors duration-100',
                    isSelected
                      ? 'border-l-[3px] border-l-brand-yellow bg-surface-accent'
                      : 'border-l-[3px] border-l-transparent hover:bg-surface-inset/60'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors duration-200 mt-0.5',
                      isSelected
                        ? 'bg-brand-yellow border-brand-yellow-dark text-brand-black'
                        : 'border-border-subtle bg-brand-white'
                    )}
                  >
                    {isSelected && <Check className="w-4 h-4" strokeWidth={3} aria-hidden />}
                  </div>

                  <div className="flex-shrink-0">
                    {product.image ? (
                      <img
                        src={getImageUrl(product.image) || undefined}
                        alt={product.name}
                        className="h-12 w-12 rounded-[10px] object-cover border border-border-subtle"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-surface-inset rounded-[10px] border border-border-subtle" aria-hidden />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-card-title text-brand-black truncate">{product.name}</div>
                    <div className="text-caption text-text-muted">{product.article}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-overline text-text-muted">себ-ть</div>
                    <div className="text-caption tabular-nums text-text-muted">
                      {formatPriceKZT(Number(product.costPrice), priceFormatOptions)}
                    </div>
                    <div className="text-price tabular-nums text-brand-black mt-0.5">
                      {formatPriceKZT(final, priceFormatOptions)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={handlePageChange}
          variant="numbered"
        />
      )}
    </Card>
  );

  const settingsPanel = (
    <Card className="shrink-0">
      <CardHeader className="lg:hidden">
        <h2 className="flex items-center gap-2 text-section-title text-brand-black">
          <Settings2 className="h-5 w-5 shrink-0 text-brand-yellow" aria-hidden />
          Настройки
        </h2>
        {selectedCount > 0 && (
          <p className="mt-1 text-caption text-text-muted">Выбрано товаров: {selectedCount}</p>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        <Input
          label="Заголовок прайса"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ПРАЙС-ЛИСТ"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1">
            <Input
              label="Наценка, %"
              type="number"
              min={0}
              step={1}
              value={markupPercent}
              onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex min-h-11 flex-1 items-center rounded-xl border border-border-subtle bg-surface-inset px-3 py-2 text-body text-text-muted">
            Округление до <strong className="mx-1 text-brand-black">5</strong>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={downloading}
          disabled={items.length === 0}
          leftIcon={Download}
          onClick={handleDownload}
        >
          Скачать прайс PDF ({items.length})
        </Button>
      </CardBody>
    </Card>
  );

  const previewPanel = (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader className="shrink-0 lg:hidden">
        <h2 className="flex items-center gap-2 text-section-title text-brand-black">
          <Table2 className="h-5 w-5 shrink-0 text-brand-yellow" aria-hidden />
          Превью
        </h2>
        {selectedCount > 0 && (
          <p className="mt-1 text-caption text-text-muted">{selectedCount} позиций</p>
        )}
      </CardHeader>
      <CardBody className="min-h-0 flex-1 overflow-y-auto p-0 lg:p-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="Пока пусто"
            description="Отметьте товары во вкладке «Выбор товаров», чтобы добавить их в прайс"
            className="py-12"
          />
        ) : (
          <Table className="text-sm">
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell className="w-10 px-2 py-2 normal-case tracking-normal">
                  №
                </TableHeaderCell>
                <TableHeaderCell className="w-12 px-2 py-2 normal-case tracking-normal">
                  Фото
                </TableHeaderCell>
                <TableHeaderCell className="px-2 py-2 normal-case tracking-normal">
                  Артикул
                </TableHeaderCell>
                <TableHeaderCell className="px-2 py-2 normal-case tracking-normal">
                  Название
                </TableHeaderCell>
                <TableHeaderCell className="w-24 px-2 py-2 text-right normal-case tracking-normal">
                  Цена
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={`${it.article}-${i}`}>
                  <TableCell className="px-2 py-2 whitespace-normal">{i + 1}</TableCell>
                  <TableCell className="px-2 py-2 whitespace-normal">
                    {it.image ? (
                      <img
                        src={getImageUrl(it.image) || undefined}
                        alt={it.name}
                        className="h-9 w-9 object-contain border border-border-subtle rounded-[10px]"
                      />
                    ) : (
                      <div className="h-9 w-9 bg-surface-inset border border-border-subtle rounded-[10px]" aria-hidden />
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-text-muted text-xs whitespace-normal">
                    {it.article}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-brand-black font-medium whitespace-normal">
                    {it.name}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-right text-price tabular-nums whitespace-nowrap">
                    {formatPriceKZT(it.finalPrice, priceFormatOptions)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="h-full flex flex-col gap-4 min-h-0">
        <div className="lg:hidden top-0 z-10 -mx-4 px-4 pt-1 pb-3 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-section-title font-semibold text-brand-black flex items-center gap-2">
              <Tag className="w-5 h-5 text-brand-yellow shrink-0" aria-hidden />
              Прайс-лист
            </h1>
            {selectedCount > 0 && (
              <span className="inline-flex items-center self-start sm:self-auto px-3 py-1.5 rounded-pill bg-brand-yellow/15 text-sm font-medium text-brand-black border border-brand-yellow/30">
                Выбрано: {selectedCount}
              </span>
            )}
          </div>

          <nav
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-0.5"
            aria-label="Разделы прайс-листа"
          >
            {MOBILE_TABS.map(({ id, label, icon: TabIcon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobileTab(id)}
                className={cn(
                  'flex shrink-0 snap-start flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-4 py-2.5 min-h-11 rounded-card text-xs sm:text-sm font-medium transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-1',
                  mobileTab === id
                    ? 'bg-brand-yellow text-brand-black shadow-sm'
                    : 'text-text-muted bg-surface-inset hover:text-brand-black'
                )}
                aria-current={mobileTab === id ? 'page' : undefined}
              >
                <TabIcon className="w-4 h-4 shrink-0" aria-hidden />
                <span className="leading-tight text-center whitespace-nowrap">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <PageHeader
          className="hidden lg:flex"
          title="Прайс-лист"
          description="Формирование PDF-прайса с наценкой"
          icon={Tag}
          badge={
            selectedCount > 0 ? (
              <span className="inline-flex items-center rounded-pill border border-brand-yellow/30 bg-surface-accent px-3 py-1.5 text-caption font-medium text-brand-black">
                Выбрано: {selectedCount}
              </span>
            ) : undefined
          }
        />

        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          <div
            className={cn(
              'min-h-0 flex flex-col flex-1 lg:w-1/2 lg:min-w-[28rem] lg:max-w-[50%] lg:shrink-0 lg:flex-none',
              !showPanel('products') && 'hidden lg:flex'
            )}
          >
            {productsPanel}
          </div>

          <div
            className={cn(
              'min-h-0 flex min-w-0 flex-col gap-4 flex-1',
              mobileTab !== 'settings' && mobileTab !== 'preview' && 'hidden lg:flex'
            )}
          >
            <div className="hidden shrink-0 lg:block">
              <h2 className="text-section-title text-brand-black">Параметры и предпросмотр</h2>
              {selectedCount > 0 && (
                <p className="mt-1 text-caption text-text-muted">Выбрано товаров: {selectedCount}</p>
              )}
            </div>

            <div className={cn('shrink-0', !showPanel('settings') && 'hidden lg:block')}>{settingsPanel}</div>

            <div className={cn('min-h-0 flex-1 flex flex-col', !showPanel('preview') && 'hidden lg:flex')}>
              {previewPanel}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
