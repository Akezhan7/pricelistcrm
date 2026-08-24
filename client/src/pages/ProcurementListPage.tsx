import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactSelect from 'react-select';
import { ArrowRight, Check, FileText, PackageSearch, Plus, Save, ShoppingBasket, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import { toast } from '../context/ToastContext';
import productsApi from '../services/productsApi';
import procurementListsApi, {
  type ProcurementList,
  type ProcurementListItem,
  type ProcurementListItemInput,
  type ProcurementListData,
  type ProcurementCreatedOrder,
  type ProcurementSupplier,
} from '../services/procurementListsApi';
import type { Product } from '../types';

const ALLOWED_ROLES = new Set(['admin', 'purchase_manager', 'warehouse_operator', 'collector']);

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

type ItemRowProps = {
  item: ProcurementListItem;
  suppliers: ProcurementSupplier[];
  busy: boolean;
  onSave: (itemId: number, input: ProcurementListItemInput) => Promise<void>;
  onSupplierChange: (
    itemId: number,
    selectedSupplierId: number | null,
    purchasePrice: number | null
  ) => Promise<void>;
  onDelete: (item: ProcurementListItem) => Promise<void>;
};

const ProcurementItemRow: React.FC<ItemRowProps> = ({
  item,
  suppliers,
  busy,
  onSave,
  onSupplierChange,
  onDelete,
}) => {
  const [quantity, setQuantity] = useState(String(item.requestedQuantity));
  const [observedStock, setObservedStock] = useState(
    item.observedStock === null ? '' : String(item.observedStock)
  );
  const [notes, setNotes] = useState(item.notes || '');
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    item.selectedSupplierId === null ? '' : String(item.selectedSupplierId)
  );
  const [purchasePrice, setPurchasePrice] = useState(
    item.purchasePrice === null ? '' : String(item.purchasePrice)
  );

  useEffect(() => {
    setQuantity(String(item.requestedQuantity));
    setObservedStock(item.observedStock === null ? '' : String(item.observedStock));
    setNotes(item.notes || '');
    setSelectedSupplierId(
      item.selectedSupplierId === null ? '' : String(item.selectedSupplierId)
    );
    setPurchasePrice(item.purchasePrice === null ? '' : String(item.purchasePrice));
  }, [item]);

  const parsedQuantity = Number(quantity);
  const parsedObservedStock = observedStock === '' ? null : Number(observedStock);
  const parsedPurchasePrice = purchasePrice === '' ? null : Number(purchasePrice);
  const valid = Number.isInteger(parsedQuantity)
    && parsedQuantity > 0
    && (parsedObservedStock === null
      || (Number.isInteger(parsedObservedStock) && parsedObservedStock >= 0))
    && (parsedPurchasePrice === null
      || (Number.isFinite(parsedPurchasePrice) && parsedPurchasePrice >= 0));
  const changed = parsedQuantity !== item.requestedQuantity
    || parsedObservedStock !== item.observedStock
    || notes.trim() !== (item.notes || '')
    || (selectedSupplierId === '' ? null : Number(selectedSupplierId)) !== item.selectedSupplierId
    || parsedPurchasePrice !== (item.purchasePrice === null ? null : Number(item.purchasePrice));
  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: supplier.name,
  }));
  const selectedSupplierOption = supplierOptions.find(
    (option) => String(option.value) === selectedSupplierId
  ) || null;

  const selectSupplier = async (supplierId: number | null) => {
    const recommendation = item.supplierRecommendation;
    const linkedSupplier = item.product.suppliers?.find(
      (supplier) => supplier.id === supplierId
    );
    const recommendedPrice = recommendation.supplier?.id === supplierId
      ? recommendation.purchasePrice
      : null;
    const linkedPrice = linkedSupplier?.ProductSupplier?.supplierPrice;
    const nextPrice = recommendedPrice
      ?? (linkedPrice === undefined ? null : Number(linkedPrice));

    setSelectedSupplierId(supplierId === null ? '' : String(supplierId));
    setPurchasePrice(nextPrice === null ? '' : String(nextPrice));
    await onSupplierChange(item.id, supplierId, nextPrice);
  };

  const recommendationLabel = item.supplierRecommendation.source === 'last_successful_purchase'
    ? 'Последний успешный закуп'
    : 'Единственный поставщик товара';

  return (
    <div className="border-b border-border-subtle px-4 py-4 last:border-b-0">
      <div className="grid gap-3 xl:grid-cols-[minmax(15rem,1.5fr)_9rem_10rem_minmax(14rem,1fr)_auto] xl:items-end">
        <div className="min-w-0 self-center">
          <p className="text-card-title text-brand-black break-words">
            {item.product.internalName || item.product.name}
          </p>
          <p className="mt-1 text-caption text-text-muted">{item.product.article}</p>
          <p className="mt-1 text-caption text-text-muted">
            Добавил: {item.addedBy?.name || 'Сотрудник'}
          </p>
        </div>
        <Input
          label="Закупить, шт."
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={busy}
        />
        <Input
          label="Осталось, шт."
          type="number"
          min="0"
          step="1"
          placeholder="Не указано"
          value={observedStock}
          onChange={(event) => setObservedStock(event.target.value)}
          disabled={busy}
        />
        <Input
          label="Комментарий"
          value={notes}
          maxLength={2000}
          placeholder="Например, проверить упаковку"
          onChange={(event) => setNotes(event.target.value)}
          disabled={busy}
        />
        <div className="flex items-center gap-1 xl:pb-0.5">
          <IconButton
            icon={Save}
            title="Сохранить позицию"
            variant="default"
            disabled={busy || !valid || !changed}
            onClick={() => onSave(item.id, {
              requestedQuantity: parsedQuantity,
              observedStock: parsedObservedStock,
              notes: notes.trim() || null,
              selectedSupplierId: selectedSupplierId === ''
                ? null
                : Number(selectedSupplierId),
              purchasePrice: parsedPurchasePrice,
            })}
          />
          <IconButton
            icon={Trash2}
            title="Удалить из закупочного листа"
            variant="danger"
            disabled={busy}
            onClick={() => onDelete(item)}
          />
        </div>
      </div>

      <div className="mt-3 grid gap-3 border-l-2 border-brand-yellow pl-3 md:grid-cols-[minmax(15rem,1fr)_10rem_minmax(16rem,1fr)] md:items-end">
        <div className="w-full">
          <label className="mb-1.5 block text-caption font-medium text-brand-black">
            Поставщик
          </label>
          <ReactSelect
            options={supplierOptions}
            value={selectedSupplierOption}
            onChange={(option) => selectSupplier(option?.value ?? null)}
            placeholder="Найти поставщика"
            noOptionsMessage={() => 'Поставщики не найдены'}
            isClearable
            isDisabled={busy}
            menuPosition="fixed"
            menuPortalTarget={document.body}
            maxMenuHeight={280}
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: '44px',
                borderRadius: '8px',
                borderColor: state.isFocused ? '#f4bd00' : '#d1d5db',
                boxShadow: state.isFocused ? '0 0 0 2px rgba(244, 189, 0, 0.2)' : 'none',
                ':hover': { borderColor: '#9ca3af' },
              }),
              menuPortal: (base) => ({ ...base, zIndex: 70 }),
            }}
          />
        </div>
        <Input
          label="Цена закупа"
          type="number"
          min="0"
          step="0.01"
          placeholder="Не указана"
          value={purchasePrice}
          onChange={(event) => setPurchasePrice(event.target.value)}
          disabled={busy || selectedSupplierId === ''}
        />
        <div className="min-w-0 pb-0.5">
          {item.supplierRecommendation.supplier ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-caption text-text-muted">
                {recommendationLabel}: <span className="font-medium text-brand-black">
                  {item.supplierRecommendation.supplier.name}
                </span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leftIcon={Check}
                disabled={busy}
                onClick={() => selectSupplier(item.supplierRecommendation.supplier!.id)}
              >
                Применить
              </Button>
            </div>
          ) : (
            <p className="text-caption text-text-muted">
              CRM не нашла однозначного поставщика. Выберите его вручную.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProcurementListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const [list, setList] = useState<ProcurementList | null>(null);
  const [suppliers, setSuppliers] = useState<ProcurementSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [observedStock, setObservedStock] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingOrders, setCreatingOrders] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<ProcurementCreatedOrder[]>([]);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);

  const canAccess = Boolean(user && ALLOWED_ROLES.has(user.role));
  const canCreateOrders = user?.role === 'admin' || user?.role === 'purchase_manager';

  const applyListData = useCallback((data: ProcurementListData) => {
    setList(data.list);
    setSuppliers(data.suppliers);
  }, []);

  const loadList = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      applyListData(await procurementListsApi.getCurrent());
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Не удалось загрузить закупочный лист'));
    } finally {
      setLoading(false);
    }
  }, [applyListData, canAccess]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const normalizedSearch = search.trim();
    if (normalizedSearch.length < 2 || selectedProduct) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const products = await productsApi.getProducts({ search: normalizedSearch, limit: 30 });
        if (!cancelled) setSearchResults(products);
      } catch (searchError) {
        if (!cancelled) {
          setSearchResults([]);
          toast.error(getErrorMessage(searchError, 'Не удалось найти товары'));
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search, selectedProduct]);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearch(product.internalName || product.name);
    setSearchResults([]);
  };

  const clearSelectedProduct = () => {
    setSelectedProduct(null);
    setSearch('');
    setQuantity('1');
    setObservedStock('');
    setNotes('');
  };

  const parsedQuantity = Number(quantity);
  const parsedObservedStock = observedStock === '' ? null : Number(observedStock);
  const addReady = Boolean(
    selectedProduct
    && Number.isInteger(parsedQuantity)
    && parsedQuantity > 0
    && (parsedObservedStock === null
      || (Number.isInteger(parsedObservedStock) && parsedObservedStock >= 0))
  );

  const handleAdd = async () => {
    if (!selectedProduct || !addReady) return;
    setSaving(true);
    try {
      applyListData(await procurementListsApi.addItem(selectedProduct.id, {
        requestedQuantity: parsedQuantity,
        observedStock: parsedObservedStock,
        notes: notes.trim() || null,
      }));
      toast.success('Товар добавлен в закупочный лист');
      clearSelectedProduct();
      setError('');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Не удалось добавить товар'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (itemId: number, input: ProcurementListItemInput) => {
    setBusyItemId(itemId);
    try {
      applyListData(await procurementListsApi.updateItem(itemId, input));
      toast.success('Позиция сохранена');
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Не удалось сохранить позицию'));
    } finally {
      setBusyItemId(null);
    }
  };

  const handleSupplierChange = async (
    itemId: number,
    selectedSupplierId: number | null,
    purchasePrice: number | null
  ) => {
    setBusyItemId(itemId);
    try {
      applyListData(await procurementListsApi.updateItem(itemId, {
        selectedSupplierId,
        purchasePrice,
      }));
    } catch (saveError) {
      toast.error(getErrorMessage(saveError, 'Не удалось выбрать поставщика'));
      await loadList();
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteItem = async (item: ProcurementListItem) => {
    const accepted = await confirm({
      title: 'Удалить позицию?',
      message: `${item.product.internalName || item.product.name} будет удалён из закупочного листа.`,
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!accepted) return;

    setBusyItemId(item.id);
    try {
      applyListData(await procurementListsApi.deleteItem(item.id));
      toast.success('Позиция удалена');
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Не удалось удалить позицию'));
    } finally {
      setBusyItemId(null);
    }
  };

  const itemCount = list?.items.length || 0;
  const listDate = useMemo(
    () => list ? new Date(list.createdAt).toLocaleDateString('ru-RU') : null,
    [list]
  );
  const supplierGroups = useMemo(() => {
    const groups = new Map<number, {
      id: number;
      name: string;
      positions: number;
      total: number;
      withoutPrice: number;
    }>();
    let unassigned = 0;

    (list?.items || []).forEach((item) => {
      if (!item.selectedSupplierId || !item.selectedSupplier?.isActive) {
        unassigned += 1;
        return;
      }

      const group = groups.get(item.selectedSupplierId) || {
        id: item.selectedSupplierId,
        name: item.selectedSupplier.name,
        positions: 0,
        total: 0,
        withoutPrice: 0,
      };
      group.positions += 1;
      if (item.purchasePrice === null) {
        group.withoutPrice += 1;
      } else {
        group.total += Number(item.purchasePrice) * item.requestedQuantity;
      }
      groups.set(group.id, group);
    });

    return {
      groups: Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      unassigned,
    };
  }, [list]);

  const formatMoney = (value: number) => new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(value);
  const readyGroups = supplierGroups.groups.filter((group) => group.withoutPrice === 0);
  const readyItemCount = readyGroups.reduce((total, group) => total + group.positions, 0);

  const handleCreateOrders = async () => {
    if (readyGroups.length === 0) {
      toast.warning('Сначала выберите поставщика и укажите цену закупа');
      return;
    }

    const accepted = await confirm({
      title: 'Создать заявки поставщикам?',
      message: 'Будет создано заявок: ' + readyGroups.length
        + ', позиций: ' + readyItemCount
        + '. Неготовые позиции останутся в закупочном листе.',
      confirmLabel: 'Создать заявки',
    });
    if (!accepted) return;

    setCreatingOrders(true);
    try {
      const result = await procurementListsApi.createOrders();
      applyListData(result);
      setCreatedOrders(result.orders);
      toast.success(
        result.blocked.length > 0
          ? 'Заявки созданы. Неготовые позиции остались в листе.'
          : 'Все заявки поставщикам созданы.'
      );
    } catch (createError) {
      toast.error(getErrorMessage(createError, 'Не удалось создать заявки'));
    } finally {
      setCreatingOrders(false);
    }
  };

  if (!canAccess) {
    return (
      <Layout>
        <div className="mx-auto flex h-full max-w-xl items-center">
          <Alert variant="error">У вашей роли нет доступа к закупочному листу.</Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullHeight>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <PageHeader
          icon={ShoppingBasket}
          title="Закупочный лист"
          description="Рабочий список товаров, которые нужно закупить"
          badge={<Badge variant="outline">{itemCount} позиций</Badge>}
        />

        {createdOrders.length > 0 && (
          <div className="shrink-0 border border-success/30 bg-success/5 px-4 py-3">
            <p className="text-body-medium text-brand-black">Созданные заявки</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {createdOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className="inline-flex items-center gap-2 text-body-medium text-brand-black hover:text-brand-yellow-dark"
                  onClick={() => navigate('/orders/' + order.id)}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  <span>{order.orderNumber} · {order.supplier.name}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle bg-brand-white shadow-sm">
          <div className="shrink-0 border-b border-border-subtle bg-surface-muted px-4 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-section-title text-brand-black">Добавить товар</p>
                <p className="text-caption text-text-muted">
                  Фактический остаток записывается только в этот лист и не меняет карточку товара.
                </p>
              </div>
              {listDate && (
                <p className="text-caption text-text-muted">Лист открыт {listDate}</p>
              )}
            </div>

            {error && <Alert variant="error" className="mt-3">{error}</Alert>}

            <div className="relative mt-4">
              <Input
                leftIcon={PackageSearch}
                label="Товар"
                value={search}
                placeholder="Название или артикул"
                onChange={(event) => {
                  setSearch(event.target.value);
                  if (selectedProduct) setSelectedProduct(null);
                }}
                disabled={saving}
                className={selectedProduct ? 'pr-11' : undefined}
              />
              {selectedProduct && (
                <div className="absolute right-1 top-[1.7rem]">
                  <IconButton
                    icon={X}
                    title="Сбросить выбранный товар"
                    variant="ghost"
                    onClick={clearSelectedProduct}
                    disabled={saving}
                  />
                </div>
              )}

              {!selectedProduct && (searching || searchResults.length > 0) && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border-subtle bg-brand-white shadow-lg">
                  {searching ? (
                    <div className="flex items-center justify-center gap-2 p-4 text-body text-text-muted">
                      <Spinner size="sm" color="brand" />
                      Поиск товаров...
                    </div>
                  ) : (
                    searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 text-left last:border-b-0 hover:bg-surface-muted"
                        onClick={() => selectProduct(product)}
                      >
                        <span className="min-w-0">
                          <span className="block text-body-medium text-brand-black break-words">
                            {product.internalName || product.name}
                          </span>
                          <span className="block text-caption text-text-muted">{product.article}</span>
                        </span>
                        <Plus className="h-4 w-4 shrink-0 text-brand-yellow-dark" aria-hidden />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[9rem_10rem_minmax(14rem,1fr)_auto] md:items-end">
                <Input
                  label="Закупить, шт."
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={saving}
                />
                <Input
                  label="Осталось, шт."
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Не указано"
                  value={observedStock}
                  onChange={(event) => setObservedStock(event.target.value)}
                  disabled={saving}
                />
                <Textarea
                  label="Комментарий"
                  rows={1}
                  maxLength={2000}
                  value={notes}
                  placeholder="Необязательно"
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={saving}
                  className="min-h-10 resize-none"
                />
                <Button
                  type="button"
                  leftIcon={Plus}
                  loading={saving}
                  disabled={saving || !addReady}
                  onClick={handleAdd}
                >
                  Добавить
                </Button>
              </div>
            )}
          </div>

          {itemCount > 0 && (
            <div className="shrink-0 border-b border-border-subtle px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-body-medium text-brand-black">
                    Предварительное распределение
                  </p>
                  <p className="text-caption text-text-muted">
                    Готово к оформлению: {readyGroups.length} групп, {readyItemCount} позиций
                  </p>
                </div>
                {canCreateOrders && (
                  <Button
                    type="button"
                    leftIcon={FileText}
                    loading={creatingOrders}
                    disabled={creatingOrders || readyGroups.length === 0}
                    onClick={handleCreateOrders}
                  >
                    Создать заявки
                  </Button>
                )}
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
                {supplierGroups.groups.map((group) => (
                  <div key={group.id} className="border-l-2 border-success pl-3">
                    <p className="truncate text-body-medium text-brand-black" title={group.name}>
                      {group.name}
                    </p>
                    <p className="text-caption text-text-muted">
                      {group.positions} поз. · {formatMoney(group.total)} ₸
                      {group.withoutPrice > 0
                        ? ' · без цены: ' + group.withoutPrice
                        : ''}
                    </p>
                  </div>
                ))}
                {supplierGroups.unassigned > 0 && (
                  <div className="border-l-2 border-warning pl-3">
                    <p className="text-body-medium text-brand-black">Без поставщика</p>
                    <p className="text-caption text-text-muted">
                      {supplierGroups.unassigned} позиций требуют выбора
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-64 items-center justify-center gap-2 text-text-muted">
                <Spinner size="md" color="brand" />
                Загрузка списка...
              </div>
            ) : itemCount === 0 ? (
              <EmptyState
                icon={ShoppingBasket}
                title="Закупочный лист пока пуст"
                description="Найдите товар по названию или артикулу и укажите необходимое количество"
              />
            ) : (
              list?.items.map((item) => (
                <ProcurementItemRow
                  key={item.id}
                  item={item}
                  suppliers={suppliers}
                  busy={busyItemId === item.id}
                  onSave={handleSaveItem}
                  onSupplierChange={handleSupplierChange}
                  onDelete={handleDeleteItem}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
