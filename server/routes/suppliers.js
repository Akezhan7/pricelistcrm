const express = require('express');
const { body } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  deleteSupplierPermanently,
  getSectors,
  getReconciliation,
} = require('../controllers/supplierController');

const router = express.Router();

// Валидаторы
const supplierValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Имя поставщика должно содержать от 1 до 100 символов'),
  body('address')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Адрес должен содержать от 1 до 200 символов'),
  body('phone')
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Телефон должен содержать от 10 до 20 символов'),
  body('whatsapp')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('WhatsApp номер не должен превышать 20 символов'),
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Сектор не должен превышать 100 символов'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Заметки не должны превышать 1000 символов'),
];

// Публичные маршруты (для всех авторизованных пользователей)
router.get('/', auth, getAllSuppliers);
router.get('/sectors', auth, getSectors);
router.get('/:id/reconciliation', auth, getReconciliation);
router.get('/:id', auth, getSupplierById);

// Маршруты для администраторов и менеджеров по закупкам
router.post('/', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  upload.single('containerImage'),
  supplierValidation,
  handleUploadError,
  createSupplier
);

router.put('/:id', 
  auth, 
  requireRole('admin', 'purchase_manager'), 
  upload.single('containerImage'),
  supplierValidation,
  handleUploadError,
  updateSupplier
);

router.delete('/:id', 
  auth, 
  requireRole('admin'), 
  deleteSupplier
);

// Полное удаление поставщика из базы данных
router.delete('/:id/permanent', 
  auth, 
  requireRole('admin'), 
  deleteSupplierPermanently
);

module.exports = router;
