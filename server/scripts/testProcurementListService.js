const assert = require('assert');

const {
  assertCanManageProcurementList,
  buildProcurementListItemData,
  buildProcurementListItemUpdate,
  buildProcurementOrderGroups,
  buildSupplierRecommendation,
} = require('../services/procurementListService');

function testAllowedRoles() {
  ['admin', 'purchase_manager', 'warehouse_operator', 'collector'].forEach((role) => {
    assert.doesNotThrow(() => assertCanManageProcurementList({ role }));
  });

  assert.throws(
    () => assertCanManageProcurementList({ role: 'operator' }),
    (error) => error.statusCode === 403
  );
}

function testCreateItemData() {
  assert.deepStrictEqual(
    buildProcurementListItemData({
      listId: 7,
      productId: 15,
      actorId: 4,
      input: {
        requestedQuantity: '6',
        observedStock: '2',
        notes: '  Проверить упаковку  ',
      },
    }),
    {
      procurementListId: 7,
      productId: 15,
      requestedQuantity: 6,
      observedStock: 2,
      notes: 'Проверить упаковку',
      addedByUserId: 4,
    }
  );

  assert.throws(
    () => buildProcurementListItemData({
      listId: 7,
      productId: 15,
      actorId: 4,
      input: { requestedQuantity: 0 },
    }),
    /requestedQuantity/
  );

  assert.deepStrictEqual(
    buildProcurementListItemData({
      listId: 7,
      productId: 16,
      actorId: 4,
      input: {
        requestedQuantity: 2,
        selectedSupplierId: '9',
        purchasePrice: '350.50',
      },
    }),
    {
      procurementListId: 7,
      productId: 16,
      requestedQuantity: 2,
      observedStock: null,
      notes: null,
      selectedSupplierId: 9,
      purchasePrice: 350.5,
      addedByUserId: 4,
    }
  );
}

function testUpdateItemData() {
  assert.deepStrictEqual(
    buildProcurementListItemUpdate({
      requestedQuantity: 3,
      observedStock: '',
      notes: '   ',
    }),
    {
      requestedQuantity: 3,
      observedStock: null,
      notes: null,
    }
  );

  assert.throws(
    () => buildProcurementListItemUpdate({ observedStock: -1 }),
    /observedStock/
  );
  assert.throws(
    () => buildProcurementListItemUpdate({}),
    /No procurement item fields/
  );

  assert.deepStrictEqual(
    buildProcurementListItemUpdate({
      selectedSupplierId: '12',
      purchasePrice: '450.25',
    }),
    {
      selectedSupplierId: 12,
      purchasePrice: 450.25,
    }
  );
  assert.deepStrictEqual(
    buildProcurementListItemUpdate({ selectedSupplierId: null }),
    {
      selectedSupplierId: null,
      purchasePrice: null,
    }
  );
  assert.throws(
    () => buildProcurementListItemUpdate({ purchasePrice: -1 }),
    /purchasePrice/
  );
}

function testSupplierRecommendation() {
  assert.deepStrictEqual(
    buildSupplierRecommendation({
      linkedSuppliers: [
        {
          id: 2,
          name: 'Linked supplier',
          isActive: true,
          ProductSupplier: { supplierPrice: '100.00' },
        },
      ],
      lastPurchase: {
        supplier: { id: 7, name: 'Last supplier', isActive: true },
        priceAtPurchase: '125.50',
        purchasedAt: '2026-08-20T10:00:00.000Z',
      },
    }),
    {
      source: 'last_successful_purchase',
      supplier: { id: 7, name: 'Last supplier' },
      purchasePrice: 125.5,
      purchasedAt: '2026-08-20T10:00:00.000Z',
    }
  );

  assert.deepStrictEqual(
    buildSupplierRecommendation({
      linkedSuppliers: [
        {
          id: 2,
          name: 'Only supplier',
          isActive: true,
          ProductSupplier: { supplierPrice: '99.90' },
        },
      ],
    }),
    {
      source: 'single_linked_supplier',
      supplier: { id: 2, name: 'Only supplier' },
      purchasePrice: 99.9,
      purchasedAt: null,
    }
  );

  assert.deepStrictEqual(
    buildSupplierRecommendation({
      linkedSuppliers: [
        { id: 2, name: 'First', isActive: true },
        { id: 3, name: 'Second', isActive: true },
      ],
    }),
    {
      source: 'none',
      supplier: null,
      purchasePrice: null,
      purchasedAt: null,
    }
  );
}

function testProcurementOrderGroups() {
  const result = buildProcurementOrderGroups({
    actor: { id: 4, role: 'purchase_manager' },
    items: [
      {
        id: 11,
        productId: 101,
        requestedQuantity: 2,
        selectedSupplierId: 7,
        purchasePrice: '125.50',
        notes: 'First',
      },
      {
        id: 12,
        productId: 102,
        requestedQuantity: 3,
        selectedSupplierId: 7,
        purchasePrice: 50,
      },
      {
        id: 13,
        productId: 103,
        requestedQuantity: 1,
        selectedSupplierId: 8,
        purchasePrice: 400,
      },
      {
        id: 14,
        productId: 104,
        requestedQuantity: 5,
        selectedSupplierId: null,
        purchasePrice: null,
      },
      {
        id: 15,
        productId: 105,
        requestedQuantity: 1,
        selectedSupplierId: 9,
        purchasePrice: 10,
        orderItemId: 300,
      },
    ],
  });

  assert.deepStrictEqual(
    result.groups.map((group) => ({
      supplierId: group.supplierId,
      itemIds: group.items.map((item) => item.procurementListItemId),
      totalAmount: group.totalAmount,
    })),
    [
      { supplierId: 7, itemIds: [11, 12], totalAmount: 401 },
      { supplierId: 8, itemIds: [13], totalAmount: 400 },
    ]
  );
  assert.deepStrictEqual(result.blocked, [
    { itemId: 14, supplierId: null, reason: 'supplier_required' },
  ]);
}

function testIncompleteSupplierGroupDoesNotBlockOtherGroups() {
  const result = buildProcurementOrderGroups({
    actor: { id: 1, role: 'admin' },
    items: [
      {
        id: 20,
        productId: 200,
        requestedQuantity: 1,
        selectedSupplierId: 10,
        purchasePrice: null,
      },
      {
        id: 21,
        productId: 201,
        requestedQuantity: 2,
        selectedSupplierId: 10,
        purchasePrice: 100,
      },
      {
        id: 22,
        productId: 202,
        requestedQuantity: 1,
        selectedSupplierId: 11,
        purchasePrice: 50,
      },
    ],
  });

  assert.deepStrictEqual(result.groups.map((group) => group.supplierId), [11]);
  assert.deepStrictEqual(result.blocked, [
    { itemId: 20, supplierId: 10, reason: 'purchase_price_required' },
    { itemId: 21, supplierId: 10, reason: 'supplier_group_incomplete' },
  ]);

  assert.throws(
    () => buildProcurementOrderGroups({
      actor: { id: 2, role: 'collector' },
      items: [],
    }),
    /not permitted/
  );
}

testAllowedRoles();
testCreateItemData();
testUpdateItemData();
testSupplierRecommendation();
testProcurementOrderGroups();
testIncompleteSupplierGroupDoesNotBlockOtherGroups();
console.log('Procurement list service test passed');
