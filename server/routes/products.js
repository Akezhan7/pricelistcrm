const express = require('express');
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const { upload, uploadProductAsset, handleUploadError } = require('../middleware/upload');
const {
  getAllProducts,
  getProductWorkflowQueue,
  getProductById,
  getProductAssets,
  createProductAsset,
  deleteProductAsset,
  createProductDraft,
  createProduct,
  assignDesignerToProduct,
  bulkAssignDesignerToProducts,
  submitProductContent,
  submitProductReview,
  approveProductReview,
  requestProductRevision,
  resubmitProductRevision,
  getProductRevisionRequests,
  getProductMarketplaceListings,
  saveProductMarketplaceListing,
  updateProductMarketplaceListing,
  markProductPlacementReady,
  updateProduct,
  deleteProduct,
  addSupplierToProduct,
  removeSupplierFromProduct,
  updateProductSupplier,
  addProductVariation,
  getProductVariations,
  updateProductVariation,
  deleteProductVariation,
  getLowStockProducts,
  getStockAnalytics,
  updateProductStock,
  getPurchaseSuggestions,
} = require('../controllers/productController');
const { getProductPriceHistory } = require('../controllers/priceHistoryController');
const { getProductHistory } = require('../controllers/productHistoryController');
const {
  completeProductWarehouse,
  getLifecycleOperations,
  markProductArrived,
  markProductPurchased,
} = require('../controllers/productLifecyclePurchaseController');
const {
  completeProductSaleLaunch,
  getProductLaunchFlags,
  updateProductLaunchFlags,
} = require('../controllers/productSaleLaunchController');

const router = express.Router();

// Валидаторы
const productValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Название товара должно содержать от 1 до 200 символов'),
  body('article')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Артикул должен содержать от 1 до 50 символов'),
  body('costPrice')
    .isFloat({ min: 0 })
    .withMessage('Себестоимость должна быть положительным числом'),
  body('sellingPrice')
    .isFloat({ min: 0 })
    .withMessage('Цена продажи должна быть положительным числом'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Описание не должно превышать 1000 символов'),
];

const productDraftValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product draft name must contain 1 to 200 characters'),
  body('costPrice')
    .isFloat({ min: 0 })
    .withMessage('costPrice must be a non-negative number'),
  body('supplierId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('supplierId must be a positive integer'),
  body('supplierPrice')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('supplierPrice must be a non-negative number'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

const productUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Название товара должно содержать от 1 до 200 символов'),
  body('article')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Артикул должен содержать от 1 до 50 символов'),
  body('costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Себестоимость должна быть положительным числом'),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Цена продажи должна быть положительным числом'),
  body('currentStock').optional().isInt({ min: 0 }),
  body('minStock').optional().isInt({ min: 0 }),
  body('categoryId').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('description').optional().isLength({ max: 1000 }),
];

// Публичные маршруты (для всех авторизованных пользователей)
router.get('/', auth, getAllProducts);
router.get('/low-stock', auth, getLowStockProducts);
router.get('/stock-analytics', auth, getStockAnalytics);
router.get('/purchase-suggestions', auth, getPurchaseSuggestions);
router.get('/workflow', auth, getProductWorkflowQueue);
router.get('/:id/assets', auth, getProductAssets);
router.get('/:id/revisions', auth, getProductRevisionRequests);
router.get('/:id/marketplaces', auth, getProductMarketplaceListings);
router.get('/:id/lifecycle/operations', auth, getLifecycleOperations);
router.get('/:id/launch-flags', auth, getProductLaunchFlags);
router.get('/:id/history', auth, getProductHistory);
router.get('/:id', auth, getProductById);

// Маршруты для администраторов и менеджеров по закупкам
router.post('/drafts',
  auth,
  requireRole('admin'),
  upload.single('image'),
  productDraftValidation,
  handleUploadError,
  createProductDraft
);

router.post('/', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  upload.single('image'),
  productValidation,
  handleUploadError,
  createProduct
);

router.put('/:id', 
  auth, 
  requireRole('admin'),
  upload.single('image'),
  productUpdateValidation,
  handleUploadError,
  updateProduct
);

router.delete('/:id', 
  auth, 
  requireRole('admin'), 
  deleteProduct
);

// PUT /api/products/:id/stock - Обновление остатков товара
router.post('/:id/lifecycle/assign-designer',
  auth,
  requireRole('admin'),
  [
    body('designerId').isInt({ min: 1 }).withMessage('designerId must be a positive integer'),
  ],
  assignDesignerToProduct
);

router.post('/:id/lifecycle/submit-content',
  auth,
  requireRole('admin', 'designer'),
  submitProductContent
);

router.post('/:id/lifecycle/submit-review',
  auth,
  requireRole('admin', 'designer'),
  submitProductReview
);

router.post('/:id/lifecycle/approve',
  auth,
  requireRole('admin'),
  [
    body('kpiWeight')
      .isFloat({ gt: 0, max: 99.99 })
      .withMessage('kpiWeight must be a positive number up to 99.99'),
  ],
  approveProductReview
);

router.post('/:id/lifecycle/request-revision',
  auth,
  requireRole('admin'),
  uploadProductAsset.single('attachment'),
  [
    body('comment')
      .trim()
      .isLength({ min: 1, max: 4000 })
      .withMessage('Revision comment is required'),
  ],
  handleUploadError,
  requestProductRevision
);

router.post('/:id/lifecycle/resubmit-revision',
  auth,
  requireRole('admin', 'designer'),
  resubmitProductRevision
);

router.post('/:id/lifecycle/mark-placement-ready',
  auth,
  requireRole('admin', 'marketplace_manager'),
  markProductPlacementReady
);

router.post('/:id/lifecycle/mark-purchased',
  auth,
  requireRole('admin', 'purchase_manager'),
  [
    body('supplierId').isInt({ min: 1 }),
    body('quantity').isInt({ min: 1 }),
    body('purchasePrice').isFloat({ min: 0 }),
    body('expectedDeliveryDate').optional({ values: 'falsy' }).isISO8601(),
    body('deliveryLocation').optional({ values: 'falsy' }).isLength({ max: 200 }),
    body('notes').optional({ values: 'falsy' }).isLength({ max: 2000 }),
  ],
  markProductPurchased
);

router.post('/:id/lifecycle/mark-arrived',
  auth,
  requireRole('admin', 'purchase_manager'),
  [
    body('receivedQuantity').isInt({ min: 1 }),
    body('notes').optional({ values: 'falsy' }).isLength({ max: 2000 }),
  ],
  markProductArrived
);

router.post('/:id/lifecycle/complete-warehouse',
  auth,
  requireRole('admin', 'warehouse_operator'),
  [
    body('sector').trim().isLength({ min: 1, max: 80 }),
    body('shelf').trim().isLength({ min: 1, max: 80 }),
    body('cell').trim().isLength({ min: 1, max: 80 }),
    body('weight').isFloat({ gt: 0 }),
    body('length').isFloat({ gt: 0 }),
    body('width').isFloat({ gt: 0 }),
    body('height').isFloat({ gt: 0 }),
    body('costPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }),
    body('notes').optional({ values: 'falsy' }).isLength({ max: 2000 }),
  ],
  completeProductWarehouse
);

const saleLaunchValidation = [
  body('advertisingStarted').isBoolean(),
  body('promotionStarted').isBoolean(),
  body('reviewBonusEnabled').isBoolean(),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }),
];

router.post('/:id/lifecycle/complete-sale-launch',
  auth,
  requireRole('admin', 'marketplace_manager'),
  saleLaunchValidation,
  completeProductSaleLaunch
);

router.put('/:id/launch-flags',
  auth,
  requireRole('admin', 'marketplace_manager'),
  saleLaunchValidation,
  updateProductLaunchFlags
);

router.post('/bulk/assign-designer',
  auth,
  requireRole('admin'),
  [
    body('productIds')
      .isArray({ min: 1 })
      .withMessage('productIds must contain at least one product'),
    body('productIds.*')
      .isInt({ min: 1 })
      .withMessage('productIds must contain positive integer ids'),
    body('designerId').isInt({ min: 1 }).withMessage('designerId must be a positive integer'),
  ],
  bulkAssignDesignerToProducts
);

router.post('/:id/assets',
  auth,
  requireRole('admin', 'designer'),
  uploadProductAsset.single('asset'),
  handleUploadError,
  createProductAsset
);

router.delete('/:id/assets/:assetId',
  auth,
  requireRole('admin', 'designer'),
  deleteProductAsset
);

router.post('/:id/marketplaces',
  auth,
  requireRole('admin', 'marketplace_manager'),
  [
    body('marketplace').optional().isString().isLength({ min: 1, max: 40 }),
    body('status').optional().isString().isLength({ min: 1, max: 40 }),
    body('sku').optional({ nullable: true }).isLength({ max: 120 }),
    body('marketplaceName').optional({ nullable: true }).isLength({ max: 255 }),
    body('marketplaceArticle').optional({ nullable: true }).isLength({ max: 120 }),
    body('price').optional({ nullable: true, values: 'falsy' }).isFloat({ min: 0 }),
    body('url').optional({ nullable: true }).isLength({ max: 500 }),
    body('description').optional({ nullable: true }).isLength({ max: 4000 }),
  ],
  saveProductMarketplaceListing
);

router.put('/:id/marketplaces/:listingId',
  auth,
  requireRole('admin', 'marketplace_manager'),
  [
    body('status').optional().isString().isLength({ min: 1, max: 40 }),
    body('sku').optional({ nullable: true }).isLength({ max: 120 }),
    body('marketplaceName').optional({ nullable: true }).isLength({ max: 255 }),
    body('marketplaceArticle').optional({ nullable: true }).isLength({ max: 120 }),
    body('price').optional({ nullable: true, values: 'falsy' }).isFloat({ min: 0 }),
    body('url').optional({ nullable: true }).isLength({ max: 500 }),
    body('description').optional({ nullable: true }).isLength({ max: 4000 }),
  ],
  updateProductMarketplaceListing
);

router.put('/:id/stock',
  auth,
  requireRole('admin', 'warehouse_operator'),
  [
    body('currentStock').optional().isInt({ min: 0 }).withMessage('Текущий остаток должен быть неотрицательным целым числом'),
    body('minStock').optional().isInt({ min: 0 }).withMessage('Минимальный остаток должен быть неотрицательным целым числом'),
  ],
  updateProductStock
);

// Маршрут

// Маршруты для управления поставщиками товаров
router.post('/:productId/suppliers', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  [
    body('supplierId').isInt().withMessage('ID поставщика должен быть числом'),
    body('supplierPrice').isFloat({ min: 0 }).withMessage('Цена поставщика должна быть положительным числом'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Количество должно быть неотрицательным числом'),
    body('isAvailable').optional().isBoolean().withMessage('Доступность должна быть true или false'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Заметки не должны превышать 500 символов'),
  ],
  addSupplierToProduct
);

router.delete('/:productId/suppliers/:supplierId', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  removeSupplierFromProduct
);

router.put('/:productId/suppliers/:supplierId', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  [
    body('supplierPrice').optional().isFloat({ min: 0 }).withMessage('Цена поставщика должна быть положительным числом'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Количество должно быть неотрицательным числом'),
    body('isAvailable').optional().isBoolean().withMessage('Доступность должна быть true или false'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Заметки не должны превышать 500 символов'),
  ],
  updateProductSupplier
);

// Маршруты для работы с вариациями товаров
router.get('/:productId/variations', auth, getProductVariations);

router.post('/:productId/variations', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  [
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Название вариации должно содержать от 1 до 200 символов'),
    body('value').trim().isLength({ min: 1, max: 100 }).withMessage('Значение вариации должно содержать от 1 до 100 символов'),
    body('price').isFloat({ min: 0 }).withMessage('Цена вариации должна быть положительным числом'),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Себестоимость должна быть положительным числом'),
    body('sku').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Артикул должен содержать от 1 до 100 символов'),
    body('sortOrder').optional().isInt({ min: 0 }).withMessage('Порядок сортировки должен быть неотрицательным числом'),
  ],
  addProductVariation
);

router.put('/:productId/variations/:variationId', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  [
    body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Название вариации должно содержать от 1 до 200 символов'),
    body('value').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Значение вариации должно содержать от 1 до 100 символов'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Цена вариации должна быть положительным числом'),
    body('costPrice').optional().isFloat({ min: 0 }).withMessage('Себестоимость должна быть положительным числом'),
    body('sku').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Артикул должен содержать от 1 до 100 символов'),
    body('sortOrder').optional().isInt({ min: 0 }).withMessage('Порядок сортировки должен быть неотрицательным числом'),
  ],
  updateProductVariation
);

router.delete('/:productId/variations/:variationId', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  deleteProductVariation
);

// Маршрут для получения истории цен товара
router.get('/:productId/price-history', auth, getProductPriceHistory);

module.exports = router;
