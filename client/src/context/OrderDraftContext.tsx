import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderType, ProductWithPrice } from '../types';
import type { CreateOrderInitialItem, OrderLineForm } from '../utils/orderItems';
import { getSupplierListPrice } from '../utils/orderItems';
import {
  type OrderDraft,
  type OrderDraftModalFields,
  DEFAULT_MODAL_RETURN_PATH,
  applyModalFieldsToDraft,
  calcDraftTotal,
  countDraftProducts,
  createEmptyDraft,
  initialItemsToLines,
  linesToInitialItems,
  loadOrderDraft,
  normalizeAppPath,
  orderLineFormToStored,
  productToStored,
  saveOrderDraft,
  storedToOrderLineForm,
} from '../utils/orderDraftStorage';

interface OpenModalOptions {
  origin?: 'supplier-panel' | 'modal';
  supplierId?: number;
  supplierName?: string;
  items?: CreateOrderInitialItem[];
  returnPath?: string;
  onSuccess?: () => void;
}

interface OrderDraftContextValue {
  draft: OrderDraft | null;
  isModalOpen: boolean;
  hasDraft: boolean;
  draftTotal: number;
  draftProductCount: number;

  isDraftForSupplier: (supplierId: number) => boolean;
  getSelectedIds: (supplierId: number) => Set<number>;
  getQuantities: (supplierId: number) => Record<number, number>;

  toggleDraftProduct: (
    supplierId: number,
    supplierName: string,
    product: ProductWithPrice,
    returnPath: string
  ) => void;
  setDraftProductQuantity: (supplierId: number, productId: number, quantity: number) => void;
  setDraftReturnPath: (returnPath: string) => void;

  openModal: (type: OrderType, options?: OpenModalOptions) => void;
  closeModal: () => void;
  syncModalState: (fields: OrderDraftModalFields) => void;
  clearDraft: () => void;
  continueDraft: () => void;
  completeOrder: () => void;
}

const OrderDraftContext = createContext<OrderDraftContextValue | undefined>(undefined);

function confirmReplaceDraft(currentName: string): boolean {
  return window.confirm(
    `У вас есть черновик заявки для «${currentName}». Заменить его и начать заново?`
  );
}

function shouldReplaceDraft(
  prev: OrderDraft | null,
  nextOrigin: 'supplier-panel' | 'modal',
  nextSupplierId?: number
): boolean {
  if (!prev || prev.lines.length === 0) return true;
  if (prev.origin !== nextOrigin) return confirmReplaceDraft(prev.supplierName);
  if (
    nextSupplierId &&
    prev.supplierId !== nextSupplierId &&
    prev.origin === 'supplier-panel'
  ) {
    return confirmReplaceDraft(prev.supplierName);
  }
  return true;
}

export const OrderDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OrderDraft | null>(() => loadOrderDraft());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    saveOrderDraft(draft);
  }, [draft]);

  const hasDraft = draft !== null && draft.lines.length > 0;
  const draftTotal = draft ? calcDraftTotal(draft) : 0;
  const draftProductCount = draft ? countDraftProducts(draft) : 0;

  const isDraftForSupplier = useCallback(
    (supplierId: number) =>
      draft?.origin === 'supplier-panel' && draft.supplierId === supplierId,
    [draft]
  );

  const getSelectedIds = useCallback(
    (supplierId: number) => {
      if (!isDraftForSupplier(supplierId) || !draft) return new Set<number>();
      return new Set(
        draft.lines.filter((l) => !l.productVariationId).map((l) => l.productId)
      );
    },
    [draft, isDraftForSupplier]
  );

  const getQuantities = useCallback(
    (supplierId: number) => {
      if (!isDraftForSupplier(supplierId) || !draft) return {};
      const quantities: Record<number, number> = {};
      draft.lines
        .filter((l) => !l.productVariationId)
        .forEach((l) => {
          quantities[l.productId] = l.quantity;
        });
      return quantities;
    },
    [draft, isDraftForSupplier]
  );

  const toggleDraftProduct = useCallback(
    (
      supplierId: number,
      supplierName: string,
      product: ProductWithPrice,
      returnPath: string
    ) => {
      const normalizedPath = normalizeAppPath(returnPath);

      setDraft((prev) => {
        if (!shouldReplaceDraft(prev, 'supplier-panel', supplierId)) {
          return prev;
        }

        const base =
          prev &&
          prev.origin === 'supplier-panel' &&
          prev.supplierId === supplierId
            ? { ...prev, returnPath: normalizedPath, updatedAt: Date.now() }
            : createEmptyDraft({
                supplierId,
                supplierName,
                type: prev?.type ?? 'purchase',
                origin: 'supplier-panel',
                returnPath: normalizedPath,
                lines: [],
              });

        const exists = base.lines.some(
          (l) => l.productId === product.id && !l.productVariationId
        );

        const lines = exists
          ? base.lines.filter(
              (l) => !(l.productId === product.id && !l.productVariationId)
            )
          : [
              ...base.lines,
              {
                productId: product.id,
                product: productToStored(product),
                productVariationId: null,
                quantity: 1,
                priceAtPurchase: getSupplierListPrice(product),
                notes: '',
              },
            ];

        return { ...base, lines, updatedAt: Date.now() };
      });
    },
    []
  );

  const setDraftProductQuantity = useCallback(
    (supplierId: number, productId: number, quantity: number) => {
      const qty = Math.max(1, quantity || 1);
      setDraft((prev) => {
        if (!prev || prev.origin !== 'supplier-panel' || prev.supplierId !== supplierId) {
          return prev;
        }
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.productId === productId && !l.productVariationId ? { ...l, quantity: qty } : l
          ),
          updatedAt: Date.now(),
        };
      });
    },
    []
  );

  const setDraftReturnPath = useCallback((returnPath: string) => {
    const normalizedPath = normalizeAppPath(returnPath);
    setDraft((prev) => {
      if (!prev || prev.origin !== 'supplier-panel' || prev.returnPath === normalizedPath) {
        return prev;
      }
      return { ...prev, returnPath: normalizedPath, updatedAt: Date.now() };
    });
  }, []);

  const openModal = useCallback((type: OrderType, options?: OpenModalOptions) => {
    const returnPath = normalizeAppPath(options?.returnPath ?? DEFAULT_MODAL_RETURN_PATH);
    onSuccessRef.current = options?.onSuccess ?? null;
    let accepted = true;

    if (options?.supplierId && options.supplierName) {
      const supplierId = options.supplierId;
      const supplierName = options.supplierName;
      const lines = initialItemsToLines(options.items ?? []);

      setDraft((prev) => {
        if (!shouldReplaceDraft(prev, 'supplier-panel', supplierId)) {
          accepted = false;
          return prev;
        }

        const keepPreviousLines =
          lines.length === 0 &&
          prev?.origin === 'supplier-panel' &&
          prev.supplierId === supplierId;

        return createEmptyDraft({
          supplierId,
          supplierName,
          type,
          origin: 'supplier-panel',
          returnPath,
          lines: lines.length > 0 ? lines : keepPreviousLines ? prev!.lines : [],
          deliveryLocation: keepPreviousLines ? prev!.deliveryLocation : undefined,
          expectedDeliveryDate: keepPreviousLines ? prev!.expectedDeliveryDate : undefined,
          notes: keepPreviousLines ? prev!.notes : undefined,
        });
      });
    } else {
      setDraft((prev) => {
        if (!shouldReplaceDraft(prev, 'modal')) {
          accepted = false;
          return prev;
        }

        if (prev && prev.origin === 'modal') {
          return {
            ...prev,
            type,
            returnPath,
            updatedAt: Date.now(),
          };
        }

        return createEmptyDraft({
          supplierId: 0,
          supplierName: '',
          type,
          origin: 'modal',
          returnPath,
          lines: [],
        });
      });
    }

    if (accepted) {
      setIsModalOpen(true);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    onSuccessRef.current = null;
  }, []);

  const syncModalState = useCallback((fields: OrderDraftModalFields) => {
    setDraft((prev) => applyModalFieldsToDraft(prev, fields));
  }, []);

  const clearDraft = useCallback(() => {
    setDraft(null);
    setIsModalOpen(false);
    onSuccessRef.current = null;
  }, []);

  const continueDraft = useCallback(() => {
    if (!draft) return;
    if (draft.origin === 'supplier-panel') {
      navigate(draft.returnPath);
      return;
    }
    setIsModalOpen(true);
  }, [draft, navigate]);

  const completeOrder = useCallback(() => {
    onSuccessRef.current?.();
    onSuccessRef.current = null;
    setDraft(null);
    setIsModalOpen(false);
  }, []);

  const value = useMemo<OrderDraftContextValue>(
    () => ({
      draft,
      isModalOpen,
      hasDraft,
      draftTotal,
      draftProductCount,
      isDraftForSupplier,
      getSelectedIds,
      getQuantities,
      toggleDraftProduct,
      setDraftProductQuantity,
      setDraftReturnPath,
      openModal,
      closeModal,
      syncModalState,
      clearDraft,
      continueDraft,
      completeOrder,
    }),
    [
      draft,
      isModalOpen,
      hasDraft,
      draftTotal,
      draftProductCount,
      isDraftForSupplier,
      getSelectedIds,
      getQuantities,
      toggleDraftProduct,
      setDraftProductQuantity,
      setDraftReturnPath,
      openModal,
      closeModal,
      syncModalState,
      clearDraft,
      continueDraft,
      completeOrder,
    ]
  );

  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>;
};

export const useOrderDraft = (): OrderDraftContextValue => {
  const ctx = useContext(OrderDraftContext);
  if (!ctx) {
    throw new Error('useOrderDraft must be used within OrderDraftProvider');
  }
  return ctx;
};

export function draftLinesToForm(draft: OrderDraft | null): OrderLineForm[] {
  if (!draft) return [];
  return draft.lines.map(storedToOrderLineForm);
}

export function formLinesToDraftItems(lines: OrderLineForm[]): CreateOrderInitialItem[] {
  return linesToInitialItems(lines.map(orderLineFormToStored));
}
