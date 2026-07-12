import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProductList } from '../components/ProductList';
import { SupplierCards } from '../components/SupplierCards';
import { SupplierProductsPanel } from '../components/SupplierProductsPanel';
import { Layout } from '../components/Layout';
import { Product, Supplier } from '../types';
import {
  ArrowLeft,
  RefreshCw,
  Package,
  Building2,
  LayoutDashboard,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  IconButton,
  Spinner,
} from '../components/ui';
import api from '../utils/api';
import { cn } from '../utils/cn';

const API_LIST_LIMIT = 1000;

type MobileStep = 'products' | 'suppliers';

interface DashboardMetricProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  active?: boolean;
}

const DashboardMetric: React.FC<DashboardMetricProps> = ({
  label,
  value,
  icon: Icon,
  active = false,
}) => (
  <div
    className={cn(
      'rounded-card border bg-brand-white p-4 transition-colors duration-fast',
      active
        ? 'border-brand-yellow/40 border-l-[3px] border-l-brand-yellow bg-brand-yellow/10'
        : 'border-border-subtle'
    )}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-text-muted shrink-0" aria-hidden />
      <p className="text-caption font-medium text-text-muted">{label}</p>
    </div>
    <p className="mt-1 text-h2 font-bold tabular-nums tracking-tight text-brand-black">{value}</p>
  </div>
);

function getRightPanelTitle(
  selectedSupplier: Supplier | null,
  selectedProduct: Product | null
): string {
  if (selectedSupplier) return `Каталог: ${selectedSupplier.name}`;
  if (selectedProduct) return `Поставщики: ${selectedProduct.name}`;
  return 'Все поставщики';
}

function getRightPanelDescription(
  selectedSupplier: Supplier | null,
  selectedProduct: Product | null
): string {
  if (selectedSupplier) return 'Товары и цены выбранного поставщика';
  if (selectedProduct) return 'Поставщики с этим товаром, отсортированы по цене';
  return 'Выберите товар слева для фильтрации по ценам';
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalProducts, setTotalProducts] = useState(0);
  const [mobileStep, setMobileStep] = useState<MobileStep>('products');

  const canEdit = user?.role === 'admin' || user?.role === 'purchase_manager';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, suppliersRes] = await Promise.all([
          api.get(`/products?limit=${API_LIST_LIMIT}`),
          api.get(`/suppliers?limit=${API_LIST_LIMIT}`),
        ]);

        setProducts(productsRes.data.data.products);
        setSuppliers(suppliersRes.data.data.suppliers);
        setTotalProducts(
          productsRes.data.data.pagination?.total || productsRes.data.data.products.length
        );
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const refreshData = async () => {
    try {
      const [productsRes, suppliersRes] = await Promise.all([
        api.get(`/products?limit=${API_LIST_LIMIT}`),
        api.get(`/suppliers?limit=${API_LIST_LIMIT}`),
      ]);

      setProducts(productsRes.data.data.products);
      setSuppliers(suppliersRes.data.data.suppliers);
      setTotalProducts(
        productsRes.data.data.pagination?.total || productsRes.data.data.products.length
      );
    } catch (error) {
      console.error('Ошибка обновления данных:', error);
    }
  };

  const filteredSuppliers = selectedProduct
    ? suppliers
        .filter((supplier) => supplier.products?.some((p) => p.id === selectedProduct.id))
        .sort((a, b) => {
          const priceA =
            a.products?.find((p) => p.id === selectedProduct.id)?.ProductSupplier
              .supplierPrice || 0;
          const priceB =
            b.products?.find((p) => p.id === selectedProduct.id)?.ProductSupplier
              .supplierPrice || 0;
          return priceA - priceB;
        })
    : suppliers;

  const suppliersStepEnabled = Boolean(selectedProduct || selectedSupplier);

  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      setMobileStep('suppliers');
    } else {
      setMobileStep('products');
      setSelectedSupplier(null);
    }
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setMobileStep('suppliers');
  };

  useEffect(() => {
    if (selectedSupplier) {
      const fresh = suppliers.find((s) => s.id === selectedSupplier.id);
      if (fresh) setSelectedSupplier(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  if (loading) {
    return (
      <Layout fullHeight>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Spinner size="lg" color="brand" />
          <p className="text-body text-text-muted">Загрузка данных...</p>
        </div>
      </Layout>
    );
  }

  const workflowStep = selectedSupplier ? 2 : selectedProduct ? 2 : 1;

  return (
    <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery} fullHeight>
      <div className="flex flex-col h-full gap-4 lg:gap-5 min-h-0">
        {/* Command center header */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 lg:py-0 lg:static lg:mx-0 lg:px-0 bg-surface-page/95 backdrop-blur-sm border-b border-border-subtle lg:border-0 space-y-4 shrink-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard className="h-5 w-5 text-brand-yellow shrink-0" aria-hidden />
                <span className="text-overline text-text-muted">Plastkrep CRM</span>
              </div>
              <h1 className="text-h1 font-bold tracking-tight text-brand-black sm:text-display">
                Рабочий стол
              </h1>
              <p className="mt-1 text-body text-text-muted hidden sm:block">
                Подбор товара и поставщика для новой заявки
              </p>
            </div>
            <IconButton
              icon={RefreshCw}
              title="Обновить данные"
              variant="default"
              size="md"
              onClick={refreshData}
              className="self-start sm:self-auto shrink-0"
            />
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-3 gap-3">
            <DashboardMetric
              label="Товары"
              value={totalProducts}
              icon={Package}
              active={workflowStep === 1 && mobileStep === 'products'}
            />
            <DashboardMetric
              label="Поставщики"
              value={suppliers.length}
              icon={Building2}
              active={!selectedProduct && !selectedSupplier}
            />
            <DashboardMetric
              label="В подборе"
              value={selectedProduct ? filteredSuppliers.length : '—'}
              icon={Filter}
              active={Boolean(selectedProduct)}
            />
          </div>

          {/* Mobile step tabs */}
          <div
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-0.5 lg:hidden"
            role="tablist"
            aria-label="Шаги подбора"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileStep === 'products'}
              onClick={() => setMobileStep('products')}
              className={cn(
                'flex shrink-0 snap-start items-center justify-center gap-2 min-h-11 min-w-[9rem] px-4 py-2 rounded-lg text-body-medium transition-all duration-fast',
                mobileStep === 'products'
                  ? 'bg-brand-white shadow-sm text-brand-black border border-brand-yellow/30'
                  : 'text-text-muted bg-surface-inset hover:text-brand-black'
              )}
            >
              <Badge
                variant={mobileStep === 'products' ? 'warning' : 'outline'}
                className="px-2 py-0 text-[10px] font-semibold"
              >
                Шаг 1
              </Badge>
              <span>Товары</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileStep === 'suppliers'}
              disabled={!suppliersStepEnabled}
              onClick={() => suppliersStepEnabled && setMobileStep('suppliers')}
              className={cn(
                'flex shrink-0 snap-start items-center justify-center gap-2 min-h-11 min-w-[9rem] px-4 py-2 rounded-lg text-body-medium transition-all duration-fast',
                mobileStep === 'suppliers'
                  ? 'bg-brand-white shadow-sm text-brand-black border border-brand-yellow/30'
                  : 'text-text-muted bg-surface-inset hover:text-brand-black',
                !suppliersStepEnabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Badge
                variant={mobileStep === 'suppliers' ? 'warning' : 'outline'}
                className="px-2 py-0 text-[10px] font-semibold"
              >
                Шаг 2
              </Badge>
              <span>Поставщики</span>
            </button>
          </div>

          {/* Desktop workflow breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-caption text-text-muted">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-medium transition-colors',
                workflowStep >= 1 ? 'bg-brand-yellow/10 text-brand-black' : 'bg-surface-inset'
              )}
            >
              <Package className="h-3.5 w-3.5" aria-hidden />
              1. Товар
            </span>
            <ChevronRight className="h-4 w-4 text-text-muted shrink-0" aria-hidden />
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-medium transition-colors',
                workflowStep >= 2 ? 'bg-brand-yellow/10 text-brand-black' : 'bg-surface-inset'
              )}
            >
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              2. Поставщик
            </span>
          </div>
        </div>

        {/* Active workflow context */}
        {(selectedProduct || selectedSupplier) && (
          <Card className="border-brand-yellow/30 bg-surface-accent shadow-none hover:shadow-none flex-shrink-0">
            <CardBody compact className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-3">
              <div className="min-w-0">
                <p className="text-overline text-text-muted mb-0.5">Текущий подбор</p>
                <p className="text-body-medium text-brand-black truncate">
                  {selectedProduct && (
                    <span>
                      <span className="text-text-muted">Товар:</span> {selectedProduct.name}
                    </span>
                  )}
                  {selectedProduct && selectedSupplier && (
                    <span className="text-text-muted mx-2">→</span>
                  )}
                  {selectedSupplier && (
                    <span>
                      <span className="text-text-muted">Поставщик:</span> {selectedSupplier.name}
                    </span>
                  )}
                  {selectedProduct && !selectedSupplier && (
                    <span className="text-text-muted">
                      {' '}
                      · {filteredSuppliers.length} поставщиков
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={ArrowLeft}
                onClick={() => {
                  if (selectedSupplier) {
                    setSelectedSupplier(null);
                  } else {
                    handleSelectProduct(null);
                  }
                }}
                className="text-accent hover:text-accent-hover shrink-0 self-start sm:self-auto"
              >
                {selectedSupplier ? 'К списку' : 'Сбросить'}
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Split panels */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 flex-1 min-h-0 lg:overflow-hidden">
          {/* Products panel — inset list zone */}
          <Card
            variant="default"
            className={cn(
              'w-full lg:w-[38%] xl:w-1/3 flex flex-col min-h-0 shrink-0 shadow-none hover:shadow-none',
              mobileStep !== 'products' && 'hidden lg:flex'
            )}
          >
            <CardHeader inset>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-inset border border-border-subtle">
                    <Package className="h-5 w-5 text-brand-yellow" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <CardTitle>
                      Товары
                      <span className="ml-2 text-caption font-normal text-text-muted tabular-nums">
                        {totalProducts}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Выберите позицию для фильтрации поставщиков
                    </CardDescription>
                  </div>
                </div>
                <IconButton
                  icon={RefreshCw}
                  title="Обновить товары"
                  size="md"
                  variant="ghost"
                  onClick={refreshData}
                  className="shrink-0 lg:hidden"
                />
              </div>
            </CardHeader>

            <div className="flex-1 min-h-0 flex flex-col p-3 md:p-4">
              <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-surface-inset border border-border-subtle overflow-hidden">
                <ProductList
                  products={products}
                  searchQuery={searchQuery}
                  selectedProduct={selectedProduct}
                  onSelectProduct={handleSelectProduct}
                  onRefresh={refreshData}
                  canEdit={canEdit}
                  compact
                />
              </div>
            </div>
          </Card>

          {/* Suppliers panel — elevated cards zone */}
          <Card
            variant="elevated"
            className={cn(
              'w-full lg:flex-1 flex flex-col min-h-0 min-w-0 shrink-0 shadow-none hover:shadow-none',
              (mobileStep !== 'suppliers' || !suppliersStepEnabled) && 'hidden lg:flex'
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-inset border border-border-subtle">
                    <Building2 className="h-5 w-5 text-accent" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">
                      {getRightPanelTitle(selectedSupplier, selectedProduct)}
                    </CardTitle>
                    <CardDescription>
                      {getRightPanelDescription(selectedSupplier, selectedProduct)}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            {!selectedProduct && !selectedSupplier && (
              <div className="px-4 md:px-5 py-2.5 bg-surface-accent/60 border-b border-brand-yellow/15">
                <p className="text-caption text-text-muted">
                  <span className="font-medium text-brand-black">Подсказка:</span>{' '}
                  выберите товар слева, чтобы отфильтровать поставщиков по цене и наличию
                </p>
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col p-3 md:p-4">
              <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-surface-inset border border-border-subtle overflow-hidden">
                {selectedSupplier ? (
                  <SupplierProductsPanel
                    supplier={selectedSupplier}
                    canCreate={canEdit}
                    canEdit={canEdit}
                    onOrderSuccess={refreshData}
                  />
                ) : (
                  <SupplierCards
                    suppliers={filteredSuppliers}
                    selectedProduct={selectedProduct}
                    onRefresh={refreshData}
                    canEdit={canEdit}
                    onSelectSupplier={handleSelectSupplier}
                    selectedSupplierId={null}
                  />
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
