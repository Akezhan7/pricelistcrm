import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
} from '../components/ui';
import { ProductAssetsPanel } from '../components/ProductAssetsPanel';
import { ProductMarketplacePanel } from '../components/ProductMarketplacePanel';
import { ProductReviewActions } from '../components/ProductReviewActions';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import getImageUrl from '../utils/image';
import { formatPriceKZT } from '../utils/format';
import type { ProductLifecycleStatus, ProductWorkflowItem } from '../types';
import {
  PRODUCT_LIFECYCLE_ALL_FILTERS,
  getProductLifecycleLabel,
} from '../constants/productLifecycle';

type WorkflowMeta = {
  scope: string;
  canUseExtendedFilters: boolean;
};

type WorkflowUser = {
  id: number;
  name: string;
  email?: string;
  role: string;
};

const API_LIST_LIMIT = 100;

const roleQueueLabels: Record<string, string> = {
  admin: 'Общая очередь',
  designer: 'Моя очередь дизайнера',
  marketplace_manager: 'Очередь маркетплейса',
  purchase_manager: 'Очередь закупа',
  warehouse_operator: 'Очередь склада',
  accountant: 'Очередь учета',
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
  const [products, setProducts] = useState<ProductWorkflowItem[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowMeta>({
    scope: user?.role || 'empty',
    canUseExtendedFilters: false,
  });
  const [users, setUsers] = useState<WorkflowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductLifecycleStatus | ''>('');
  const [designerFilter, setDesignerFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [totalProducts, setTotalProducts] = useState(0);
  const [assetProduct, setAssetProduct] = useState<ProductWorkflowItem | null>(null);
  const [reviewProduct, setReviewProduct] = useState<ProductWorkflowItem | null>(null);
  const [marketplaceProduct, setMarketplaceProduct] = useState<ProductWorkflowItem | null>(null);

  const canUseExtendedFilters = workflow.canUseExtendedFilters;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(API_LIST_LIMIT) });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (canUseExtendedFilters && statusFilter) params.set('lifecycleStatus', statusFilter);
      if (canUseExtendedFilters && designerFilter) params.set('designerId', designerFilter);
      if (canUseExtendedFilters && assignedFilter) params.set('assignedToUserId', assignedFilter);

      const response = await api.get(`/products/workflow?${params.toString()}`);
      setProducts(response.data.data.products || []);
      setWorkflow(response.data.data.workflow || {
        scope: user?.role || 'empty',
        canUseExtendedFilters: false,
      });
      setTotalProducts(response.data.data.pagination?.total || 0);
    } catch (error) {
      console.error('Ошибка загрузки очереди товаров:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [assignedFilter, canUseExtendedFilters, designerFilter, searchQuery, statusFilter, user?.role]);

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
    const counts = new Map<ProductLifecycleStatus, number>();
    products.forEach((product) => {
      if (!product.lifecycleStatus) return;
      counts.set(product.lifecycleStatus, (counts.get(product.lifecycleStatus) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [products]);

  const countLabel =
    totalProducts === 1 ? 'задача' : totalProducts > 1 && totalProducts < 5 ? 'задачи' : 'задач';

  const canEditAssets =
    assetProduct &&
    (user?.role === 'admin' ||
      (user?.role === 'designer' && Number(assetProduct.designerId) === Number(user.id)));

  const canSubmitContent =
    Boolean(canEditAssets) && assetProduct?.lifecycleStatus === 'assigned_to_designer';

  const handleContentSubmitted = async () => {
    setAssetProduct(null);
    await fetchProducts();
  };

  const handleWorkflowChanged = async () => {
    setReviewProduct(null);
    setMarketplaceProduct(null);
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

        <div className="rounded-xl border border-border-subtle bg-brand-white shadow-sm overflow-hidden flex flex-col min-h-0 flex-1">
          <div className="border-b border-border-subtle bg-surface-muted px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative flex-1 min-w-0">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <Input
                label="Поиск"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Название, артикул, Kaspi SKU"
                className="pl-10"
              />
            </div>

            {canUseExtendedFilters && (
              <>
                <Select
                  label="Этап"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ProductLifecycleStatus | '')
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
                  onChange={(event) => setDesignerFilter(event.target.value)}
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
                  onChange={(event) => setAssignedFilter(event.target.value)}
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
                title="Очередь пуста"
                description="Для вашей роли сейчас нет товаров, ожидающих действия."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {products.map((product) => (
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
                              {formatUserLabel(product.assignedTo)}
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
                          <Button
                            type="button"
                            size="sm"
                            variant={product.workflow.nextActionEnabled ? 'primary' : 'secondary'}
                            rightIcon={ArrowRight}
                            disabled={!product.workflow.nextActionEnabled}
                            onClick={() => {
                              if (product.workflow.nextActionKey === 'upload_content_assets') {
                                setAssetProduct(product);
                              } else if (
                                product.workflow.nextActionKey === 'submit_review' ||
                                product.workflow.nextActionKey === 'review_content' ||
                                product.workflow.nextActionKey === 'fix_revision'
                              ) {
                                setReviewProduct(product);
                              } else if (product.workflow.nextActionKey === 'marketplace_placement') {
                                setMarketplaceProduct(product);
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
                  </article>
                ))}
              </div>
            )}
          </div>
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

        <Modal
          isOpen={!!reviewProduct}
          onClose={() => setReviewProduct(null)}
          title="Проверка карточки"
          size="xl"
        >
          {reviewProduct && (
            <ProductReviewActions
              product={reviewProduct}
              currentUser={user}
              onChanged={handleWorkflowChanged}
              onOpenAssets={() => {
                setAssetProduct(reviewProduct);
                setReviewProduct(null);
              }}
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
              currentUser={user}
              onChanged={handleWorkflowChanged}
            />
          )}
        </Modal>
      </div>
    </Layout>
  );
};
