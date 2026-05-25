import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import api from '../utils/api';
import { Product } from '../types';
import { useUI } from '../context/UIContext';
import { Check, Download, Loader2, RefreshCw, Search, Tag } from 'lucide-react';
import getImageUrl from '../utils/image';
import { calculatePriceListValue } from '../utils/pricing';
import { generatePriceListPDF, PriceListPdfItem } from '../utils/pdfGenerator';

const PAGE_SIZE = 20;

interface ProductsPagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export const PriceListPage: React.FC = () => {
  const { searchQuery, setSearchQuery } = useUI();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Map<number, Product>>(new Map());
  const [markupPercent, setMarkupPercent] = useState<number>(30);
  const [downloading, setDownloading] = useState(false);
  const [title, setTitle] = useState('ПРАЙС-ЛИСТ');
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

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('ru-RU').format(Math.round(n));

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
      alert('Ошибка при формировании PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="h-full flex gap-4" style={{ minHeight: 0 }}>
        {/* Левая колонка: товары */}
        <div className="w-1/2 border border-gray-200 bg-white rounded-lg flex flex-col shadow-sm" style={{ minHeight: 0 }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-yellow-500" />
              Прайс-лист — выбор товаров
              {pagination.total > 0 && (
                <span className="text-sm font-normal text-gray-500">({pagination.total})</span>
              )}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllOnPage}
                className="text-xs text-gray-600 hover:text-gray-900"
                title="Выбрать все на текущей странице"
              >
                Все на странице
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-600 hover:text-gray-900"
                title="Очистить выбор"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Обновить"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или артикулу..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Товары не найдены</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {products.map((product) => {
                  const isSelected = selectedProducts.has(product.id);
                  const final = calculatePriceListValue(Number(product.costPrice) || 0, markupPercent);
                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => toggleSelect(product)}
                      className={`w-full text-left p-3 transition-colors flex items-start gap-3 ${
                        isSelected ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors mt-0.5 ${
                          isSelected
                            ? 'bg-yellow-400 border-yellow-500 text-black'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                      </div>

                      <div className="flex-shrink-0">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image) || undefined}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded border border-gray-200" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">{product.article}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-400">себ-ть</div>
                        <div className="text-sm text-gray-700">{formatPrice(Number(product.costPrice))} ₸</div>
                        <div className="text-xs text-yellow-700 font-semibold mt-1">→ {formatPrice(final)} ₸</div>
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
            />
          )}
        </div>

        {/* Правая колонка: настройки и превью */}
        <div className="flex-1 border border-gray-200 bg-white rounded-lg flex flex-col shadow-sm" style={{ minHeight: 0 }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Параметры и предпросмотр</h2>
            {selectedCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">Выбрано товаров: {selectedCount}</p>
            )}
          </div>

          <div className="p-4 border-b border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок прайса</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ПРАЙС-ЛИСТ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Наценка, %</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="flex-1 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
                Округление до <strong>5</strong> по правилам клиента
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || items.length === 0}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Скачать прайс PDF ({items.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
            {items.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>Отметьте товары слева, чтобы добавить их в прайс</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-yellow-400 text-black">
                    <th className="px-2 py-2 text-left w-10">№</th>
                    <th className="px-2 py-2 text-left w-12">Фото</th>
                    <th className="px-2 py-2 text-left">Артикул</th>
                    <th className="px-2 py-2 text-left">Название</th>
                    <th className="px-2 py-2 text-right w-24">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={`${it.article}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-2">{i + 1}</td>
                      <td className="px-2 py-2">
                        {it.image ? (
                          <img
                            src={getImageUrl(it.image) || undefined}
                            alt={it.name}
                            className="h-9 w-9 object-contain border border-gray-200 rounded"
                          />
                        ) : (
                          <div className="h-9 w-9 bg-gray-100 border border-gray-200 rounded" />
                        )}
                      </td>
                      <td className="px-2 py-2 text-gray-500 text-xs">{it.article}</td>
                      <td className="px-2 py-2 text-gray-900 font-medium">{it.name}</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatPrice(it.finalPrice)} ₸</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
