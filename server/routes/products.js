const express = require('express');
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  getAllProducts,
  getProductById,
  createProduct,
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
} = require('../controllers/productController');
const { getProductPriceHistory } = require('../controllers/priceHistoryController');

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

// Публичные маршруты (для всех авторизованных пользователей)
router.get('/', auth, getAllProducts);
router.get('/low-stock', auth, getLowStockProducts);
router.get('/stock-analytics', auth, getStockAnalytics);
router.get('/:id', auth, getProductById);

// Маршруты для администраторов
router.post('/', 
  auth, 
  requireRole('admin'), 
  upload.single('image'),
  productValidation,
  handleUploadError,
  createProduct
);

router.put('/:id', 
  auth, 
  requireRole('admin'), 
  upload.single('image'),
  productValidation,
  handleUploadError,
  updateProduct
);

router.delete('/:id', 
  auth, 
  requireRole('admin'), 
  deleteProduct
);

// PUT /api/products/:id/stock - Обновление остатков товара
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
  requireRole('admin'), 
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
  requireRole('admin'), 
  removeSupplierFromProduct
);

router.put('/:productId/suppliers/:supplierId', 
  auth, 
  requireRole('admin'), 
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
  requireRole('admin'), 
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
  requireRole('admin'), 
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
  requireRole('admin'), 
  deleteProductVariation
);

// Маршрут для получения истории цен товара
router.get('/:productId/price-history', auth, getProductPriceHistory);

module.exports = router;
