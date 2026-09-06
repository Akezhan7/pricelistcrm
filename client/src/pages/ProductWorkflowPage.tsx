import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Image as ImageIcon,
  History,
  Pencil,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import {
  Badge,
  Button,
  EmptyState,
  FilterChip,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
} from '../components/ui';
import { ProductAssetsPanel } from '../components/ProductAssetsPanel';
import { ProductMarketplacePanel } from '../components/ProductMarketplacePanel';
import { ProductReviewActions } from '../components/ProductReviewActions';
import { ProductPurchaseActions } from '../components/ProductPurchaseActions';
import { ProductWarehousePanel } from '../components/ProductWarehousePanel';
import { ProductSaleLaunchPanel } from '../components/ProductSaleLaunchPanel';
import { ProductHistoryModal } from '../components/ProductHistoryModal';
import { AssignDesignerModal } from '../components/AssignDesignerModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import { formatPriceKZT } from '../utils/format';
import type { ProductLifecycleStatus, ProductWorkflowItem } from '../types';
import {
  PRODUCT_LIFECYCLE_ALL_FILTERS,
  getProductLifecycleLabel,
} from '../constants/productLifecycle';
import { useProductEditor } from '../hooks/useProductEditor';

type WorkflowMeta = {
  scope: string;
  canUseExtendedFilters: boolean;
  workflowView?: 'tasks' | 'sales';
  canUseSalesView?: boolean;
};

type WorkflowUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

const WORKFLOW_PAGE_LIMIT = 50;

type WorkflowPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const roleQueueLabels: Record<string, string> = {
  admin: 'Общая очередь',
  designer: 'Моя очередь дизайнера',
  marketplace_manager: 'Очередь маркетплейса',
  purchase_manager: 'Очередь закупа',
  warehouse_operator: 'Очередь склада',
  empty: 'Нет назначенной очереди',
};

function resolveQueueTitle(scope: string) {
  return roleQueueLabels[scope] || 'Рабочая очередь';
}

function formatUserLabel(user?: { name?: string; email?: string } | null) {
  if (!user?.name) return 'Не назначен';
  return user.email ? `${user.name} · ${user.email}` : user.name;
}

export const ProductWorkflowPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductWorkflowItem[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowMeta>({
    scope: user?.role || 'empty',
    canUseExtendedFilters: false,
  });
  const [users, setUsers] = useState<WorkflowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pagination, setPagination] = useState<WorkflowPagination>({
    total: 0,
    page: 1,
    limit: WORKFLOW_PAGE_LIMIT,
    totalPages: 1,
  });
  const [statusCounts, setStatusCounts] = useState<Partial<Record<ProductLifecycleStatus, number>>>({});
  const [assetProduct, setAssetProduct] = useState<ProductWorkflowItem | null>(null);
  const [reviewProduct, setReviewProduct] = useState<ProductWorkflowItem | null>(null);
  const [marketplaceProduct, setMarketplaceProduct] = useState<ProductWorkflowItem | null>(null);
  const [purchaseProduct, setPurchaseProduct] = useState<ProductWorkflowItem | null>(null);
  const [warehouseProduct, setWarehouseProduct] = useState<ProductWorkflowItem | null>(null);
  const [saleProduct, setSaleProduct] = useState<ProductWorkflowItem | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductWorkflowItem | null>(null);
  const [assignDesignerProduct, setAssignDesignerProduct] = useState<ProductWorkflowItem | null>(null);

  const canUseExtendedFilters = user?.role === 'admin' || workflow.canUseExtendedFilters;
  const searchQuery = searchParams.get('search') || '';
  const statusFilter = (searchParams.get('status') || '') as ProductLifecycleStatus | '';
  const designerFilter = searchParams.get('designerId') || '';
  const assignedFilter = searchParams.get('assignedToUserId') || '';
  const queueView = searchParams.get('view') === 'sales' ? 'sales' : 'tasks';
  const currentPage = Math.max(Number(searchParams.get('page')) || 1, 1);

  const updateQuery = useCallback(
    (updates: Record<string, string>, { resetPage = true }: { resetPage?: boolean } = {}) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) => {
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        });
        if (resetPage) next.delete('page');
        return next;
      });
    },
    [setSearchParams]
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(WORKFLOW_PAGE_LIMIT),
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (canUseExtendedFilters && statusFilter) params.set('lifecycleStatus', statusFilter);
      if (canUseExtendedFilters && designerFilter) params.set('designerId', designerFilter);
      if (canUseExtendedFilters && assignedFilter) params.set('assignedToUserId', assignedFilter);
      if (user?.role === 'marketplace_manager') params.set('view', queueView);

      const response = await api.get(`/products/workflow?${params.toString()}`);
      setProducts(response.data.data.products || []);
      setWorkflow(response.data.data.workflow || {
        scope: user?.role || 'empty',
        canUseExtendedFilters: false,
      });
      const nextPagination = response.data.data.pagination || {
        total: 0,
        page: currentPage,
        limit: WORKFLOW_PAGE_LIMIT,
        totalPages: 1,
      };
      setPagination(nextPagination);
      setTotalProducts(nextPagination.total || 0);
      setStatusCounts(response.data.data.statusCounts || {});
    } catch (error) {
      console.error('Ошибка загрузки очереди товаров:', error);
      setProducts([]);
      setTotalProducts(0);
      setPagination({
        total: 0,
        page: 1,
        limit: WORKFLOW_PAGE_LIMIT,
        totalPages: 1,
      });
      setStatusCounts({});
    } finally {
      setLoading(false);
    }
  }, [
    assignedFilter,
    canUseExtendedFilters,
    currentPage,
    designerFilter,
    queueView,
    searchQuery,
    statusFilter,
    user?.role,
  ]);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== 'admin') return;

    setLoadingUsers(true);
    try {
      const response = await api.get('/auth/users?isActive=true');
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.role]);

  const { openEdit, loadingProductId, editorModals } = useProductEditor({
    onUpdated: fetchProducts,
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const designerUsers = useMemo(
    () => users.filter((item) => item.role === 'designer'),
    [users]
  );

  const queueStats = useMemo(() => {
    return Object.entries(statusCounts)
      .filter((entry): entry is [ProductLifecycleStatus, number] => Number(entry[1]) > 0);
  }, [statusCounts]);

  const countLabel =
    totalProducts === 1 ? 'задача' : totalProducts > 1 && totalProducts < 5 ? 'задачи' : 'задач';

  const canEditAssets = assetProduct?.permissions?.allowedActions.includes('manage_assets');

  const canSubmitContent =
    Boolean(
      canEditAssets
      && assetProduct?.permissions?.allowedActions.includes('submit_content')
    );

  const handleContentSubmitted = async () => {
    setAssetProduct(null);
    await fetchProducts();
  };

  const handleWorkflowChanged = async () => {
    setAssignDesignerProduct(null);
    setReviewProduct(null);
    setMarketplaceProduct(null);
    setPurchaseProduct(null);
    setWarehouseProduct(null);
    setSaleProduct(null);
    await fetchProducts();
  };

  return (
    <Layout fullHeight>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <PageHeader
          icon={BriefcaseBusiness}
          title="Очередь"
          description={resolveQueueTitle(workflow.scope)}
          badge={<Badge variant="outline">{totalProducts} {countLabel}</Badge>}
          actions={
            <IconButton
              icon={RefreshCw}
              title="Обновить"
              size="md"
              variant="ghost"
              onClick={fetchProducts}
            />
          }
        />

        {(user?.role === 'marketplace_manager' || workflow.canUseSalesView) && (
          <div className="flex flex-wrap gap-2">
            <FilterChip active={queueView === 'tasks'} onClick={() => updateQuery({ view: 'tasks' })}>
              Требуют действия
            </FilterChip>
            <FilterChip active={queueView === 'sales'} onClick={() => updateQuery({ view: 'sales' })}>
              В продаже
            </FilterChip>
          </div>
        )}

        <div className="rounded-xl border border-border-subtle bg-brand-white shadow-sm overflow-hidden flex flex-col min-h-0 flex-1">
          <div className="border-b border-border-subtle bg-surface-muted px-4 py-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(18rem,1fr)_minmax(12rem,14rem)_minmax(12rem,14rem)_minmax(12rem,14rem)] lg:items-end">
            <div className="min-w-0">
              <Input
                leftIcon={Search}
                label="Поиск"
                value={searchQuery}
                onChange={(event) => updateQuery({ search: event.target.value })}
                placeholder="Название, артикул, Kaspi SKU"
              />
            </div>

            {canUseExtendedFilters && (
              <>
                <Select
                  label="Этап"
                  value={statusFilter}
                  onChange={(event) =>
                    updateQuery({ status: event.target.value })
                  }
                  className="lg:w-56"
                >
                  {PRODUCT_LIFECYCLE_ALL_FILTERS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Дизайнер"
                  value={designerFilter}
                  onChange={(event) => updateQuery({ designerId: event.target.value })}
                  disabled={loadingUsers}
                  className="lg:w-56"
                >
                  <option value="">Все дизайнеры</option>
                  {designerUsers.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Ответственный"
                  value={assignedFilter}
                  onChange={(event) => updateQuery({ assignedToUserId: event.target.value })}
                  disabled={loadingUsers}
                  className="lg:w-56"
                >
                  <option value="">Все ответственные</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </>
            )}
          </div>

          {queueStats.length > 0 && (
            <div className="border-b border-border-subtle px-4 py-2.5 flex flex-wrap gap-2 bg-brand-white">
              {queueStats.map(([status, count]) => (
                <Badge key={status} variant="outline">
                  {getProductLifecycleLabel(status)}: {count}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4">
            {loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Spinner size="lg" color="brand" />
                <p className="text-body text-text-muted">Загрузка очереди...</p>
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={queueView === 'sales' ? 'Нет товаров в продаже' : 'Очередь пуста'}
                description={
                  queueView === 'sales'
                    ? 'Завершенные запуски появятся здесь.'
                    : 'Для вашей роли сейчас нет товаров, ожидающих действия.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {products.map((product) => {
                  return (
                    <article
                      key={product.id}
                      className="rounded-xl border border-border-subtle bg-brand-white p-3 shadow-sm transition-shadow hover:shadow-card-hover"
                    >
                      <div className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-inset">
                          {product.image ? (
                            <img
                              src={getImageUrl(product.image) || undefined}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-text-muted" aria-hidden />
                            </div>
                          )}
                        </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="text-card-title text-brand-black leading-snug line-clamp-2">
                              {product.name}
                            </h2>
                            <p className="mt-0.5 text-caption text-text-muted truncate">
                              {product.article}
                            </p>
                          </div>
                          {product.lifecycleStatus && (
                            <Badge variant="outline">
                              {getProductLifecycleLabel(product.lifecycleStatus)}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-caption text-text-muted sm:grid-cols-2">
                          <div className="rounded-lg bg-surface-inset px-2.5 py-2">
                            <span className="block">Дизайнер</span>
                            <span className="text-brand-black">
                              {formatUserLabel(product.designer)}
                            </span>
                          </div>
                          <div className="rounded-lg bg-surface-inset px-2.5 py-2">
                            <span className="block">Ответственный</span>
                            <span className="text-brand-black">
                              {product.responsibility?.user
                                ? formatUserLabel(product.responsibility.user)
                                : product.responsibility?.roleLabel || 'Не назначен'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-caption text-text-muted">
                            <UserRound className="h-3.5 w-3.5" aria-hidden />
                            <span>{product.workflow.ownerLabel}</span>
                            <span className="tabular-nums">
                              {formatPriceKZT(product.costPrice, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.permissions?.allowedActions.includes('view_product_history') && (
                              <IconButton
                                icon={History}
                                title="История товара"
                                size="sm"
                                variant="ghost"
                                onClick={() => setHistoryProduct(product)}
                              />
                            )}
                            {product.permissions?.canEditCard && (
                              <IconButton
                                icon={Pencil}
                                title="Редактировать карточку"
                                size="sm"
                                variant="ghost"
                                disabled={loadingProductId === product.id}
                                onClick={() => {
                                  if (product.permissions?.allowedActions.includes('edit_product_card')) {
                                    openEdit(product);
                                  } else if (product.permissions?.allowedActions.includes('manage_marketplace')) {
                                    setMarketplaceProduct(product);
                                  }
                                }}
                              />
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant={product.workflow.nextActionEnabled ? 'primary' : 'secondary'}
                              rightIcon={ArrowRight}
                              disabled={!product.workflow.nextActionEnabled}
                              onClick={() => {
                              if (product.workflow.nextActionKey === 'assign_designer') {
                                setAssignDesignerProduct(product);
                              } else if (product.workflow.nextActionKey === 'upload_content_assets') {
                                setAssetProduct(product);
                              } else if (
                                product.workflow.nextActionKey === 'submit_review' ||
                                product.workflow.nextActionKey === 'review_content' ||
                                product.workflow.nextActionKey === 'fix_revision'
                              ) {
                                setReviewProduct(product);
                              } else if (product.workflow.nextActionKey === 'marketplace_placement') {
                                setMarketplaceProduct(product);
                              } else if (
                                product.workflow.nextActionKey === 'purchase_product'
                                || product.workflow.nextActionKey === 'receive_product'
                              ) {
                                setPurchaseProduct(product);
                              } else if (product.workflow.nextActionKey === 'complete_warehouse') {
                                setWarehouseProduct(product);
                              } else if (
                                product.workflow.nextActionKey === 'complete_sale_launch'
                                || product.workflow.nextActionKey === 'manage_sale_launch'
                              ) {
                                setSaleProduct(product);
                              } else {
                                navigate('/products');
                              }
                              }}
                            >
                              {product.workflow.nextActionLabel}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={(page) => updateQuery({ page: String(page) }, { resetPage: false })}
          />
        </div>

        <Modal
          isOpen={!!assetProduct}
          onClose={() => setAssetProduct(null)}
          title="Материалы карточки"
          size="xl"
        >
          {assetProduct && (
            <ProductAssetsPanel
              productId={assetProduct.id}
              productName={assetProduct.name}
              canEdit={Boolean(canEditAssets)}
              canSubmitContent={canSubmitContent}
              onContentSubmitted={handleContentSubmitted}
            />
          )}
        </Modal>

        {editorModals}

        <AssignDesignerModal
          isOpen={!!assignDesignerProduct}
          onClose={() => setAssignDesignerProduct(null)}
          productIds={assignDesignerProduct ? [assignDesignerProduct.id] : []}
          selectedCount={assignDesignerProduct ? 1 : 0}
          onSuccess={handleWorkflowChanged}
        />

        <ProductHistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />

        <Modal
          isOpen={!!reviewProduct}
          onClose={() => setReviewProduct(null)}
          title="Проверка карточки"
          size="xl"
        >
          {reviewProduct && (
            <ProductReviewActions
              product={reviewProduct}
              onChanged={handleWorkflowChanged}
            />
          )}
        </Modal>

        <Modal
          isOpen={!!marketplaceProduct}
          onClose={() => setMarketplaceProduct(null)}
          title="Размещение на маркетплейсе"
          size="xl"
        >
          {marketplaceProduct && (
            <ProductMarketplacePanel
              product={marketplaceProduct}
              onChanged={handleWorkflowChanged}
              showMaterials
            />
          )}
        </Modal>

        <Modal
          isOpen={!!purchaseProduct}
          onClose={() => setPurchaseProduct(null)}
          title="Закуп и поступление"
          size="xl"
        >
          {purchaseProduct && (
            <ProductPurchaseActions
              product={purchaseProduct}
              onChanged={handleWorkflowChanged}
            />
          )}
        </Modal>

        <Modal
          isOpen={!!warehouseProduct}
          onClose={() => setWarehouseProduct(null)}
          title="Размещение на складе"
          size="xl"
        >
          {warehouseProduct && (
            <ProductWarehousePanel
              product={warehouseProduct}
              onChanged={handleWorkflowChanged}
            />
          )}
        </Modal>

        <Modal
          isOpen={!!saleProduct}
          onClose={() => setSaleProduct(null)}
          title="Запуск продаж"
          size="lg"
        >
          {saleProduct && (
            <ProductSaleLaunchPanel
              product={saleProduct}
              onChanged={handleWorkflowChanged}
            />
          )}
        </Modal>
      </div>
    </Layout>
  );
};
