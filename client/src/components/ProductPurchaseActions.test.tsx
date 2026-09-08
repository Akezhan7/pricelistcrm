import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductPurchaseActions } from './ProductPurchaseActions';
import productsApi from '../services/productsApi';
import procurementListsApi from '../services/procurementListsApi';
import type { ProductWorkflowItem } from '../types';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../services/productsApi', () => ({
  __esModule: true,
  default: {
    getLifecycleOperations: jest.fn(),
    reconcileProductArrival: jest.fn(),
  },
}));

jest.mock('../services/procurementListsApi', () => ({
  __esModule: true,
  default: {
    getCurrent: jest.fn(),
    addItem: jest.fn(),
  },
}));

jest.mock('../context/ToastContext', () => ({
  toast: { success: jest.fn() },
}));

const product = {
  id: 42,
  name: 'Малярный скотч',
  article: 'PK42',
  permissions: { allowedActions: ['manage_purchase'] },
} as ProductWorkflowItem;

const listItem = {
  id: 7,
  procurementListId: 3,
  productId: 42,
  requestedQuantity: 4,
  observedStock: null,
  notes: null,
  selectedSupplierId: null,
  purchasePrice: null,
  selectedSupplier: null,
  supplierRecommendation: {
    source: 'none',
    supplier: null,
    purchasePrice: null,
    purchasedAt: null,
  },
  product: {
    id: 42,
    name: 'Малярный скотч',
    internalName: null,
    article: 'PK42',
    image: null,
  },
  addedBy: { id: 1, name: 'Администратор', role: 'admin' },
  createdAt: '2026-09-06T10:00:00.000Z',
  updatedAt: '2026-09-06T10:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  (productsApi.getLifecycleOperations as jest.Mock).mockResolvedValue({ purchase: null });
  (procurementListsApi.getCurrent as jest.Mock).mockResolvedValue({
    list: null,
    suppliers: [],
  });
  (procurementListsApi.addItem as jest.Mock).mockResolvedValue({
    list: {
      id: 3,
      status: 'open',
      creator: { id: 1, name: 'Администратор', role: 'admin' },
      items: [listItem],
      createdAt: '2026-09-06T10:00:00.000Z',
      updatedAt: '2026-09-06T10:00:00.000Z',
    },
    suppliers: [],
  });
});

test('adds a purchase-stage product to the procurement list without creating an order', async () => {
  render(<ProductPurchaseActions product={product} onChanged={jest.fn()} />);

  const quantityInput = await screen.findByLabelText('Количество');
  fireEvent.change(quantityInput, { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Закупить' }));

  await screen.findByText('В закупочном листе: 4 шт.');
  expect(screen.queryByText('Оформить закуп')).not.toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  await waitFor(() => expect(procurementListsApi.addItem).toHaveBeenCalledWith(42, {
    requestedQuantity: 4,
    notes: null,
  }));
});

test('opens the linked order receipt instead of receiving one item separately', async () => {
  (productsApi.getLifecycleOperations as jest.Mock).mockResolvedValue({
    purchase: {
      id: 9,
      productId: 42,
      supplierId: 4,
      supplier: { id: 4, name: 'Ролан' },
      orderId: 22,
      order: { id: 22, orderNumber: 'ORD-22', status: 'Забрана' },
      orderItemId: 31,
      quantity: 4,
      purchasePrice: 1000,
      purchasedAt: '2026-09-08T10:00:00Z',
      purchasedBy: 1,
      arrivedAt: null,
    },
    warehouseDetails: null,
    arrivalRecovery: null,
  });

  render(<ProductPurchaseActions product={product} onChanged={jest.fn()} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Открыть приёмку заявки' }));

  expect(mockNavigate).toHaveBeenCalledWith('/warehouse/receipt?orderId=22&orderItemId=31');
  expect(productsApi.reconcileProductArrival).not.toHaveBeenCalled();
});

test('reconciles an existing receipt without creating another warehouse receipt', async () => {
  const onChanged = jest.fn();
  (productsApi.getLifecycleOperations as jest.Mock).mockResolvedValue({
    purchase: {
      id: 9,
      productId: 42,
      supplierId: 4,
      supplier: { id: 4, name: 'Ролан' },
      orderId: 22,
      order: { id: 22, orderNumber: 'ORD-22', status: 'Закрыта' },
      orderItemId: 31,
      quantity: 4,
      purchasePrice: 1000,
      purchasedAt: '2026-09-08T10:00:00Z',
      purchasedBy: 1,
      arrivedAt: null,
    },
    warehouseDetails: null,
    arrivalRecovery: {
      status: 'available',
      receiptId: 44,
      receivedQuantity: 3,
      receivedAt: '2026-09-08T11:00:00Z',
    },
  });
  (productsApi.reconcileProductArrival as jest.Mock).mockResolvedValue(undefined);

  render(<ProductPurchaseActions product={product} onChanged={onChanged} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Восстановить этап склада' }));

  await waitFor(() => expect(productsApi.reconcileProductArrival).toHaveBeenCalledWith(42));
  expect(onChanged).toHaveBeenCalled();
});
