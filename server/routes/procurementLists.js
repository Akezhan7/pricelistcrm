const express = require('express');
const { body, param } = require('express-validator');
const { auth, requireRole } = require('../middleware/auth');
const procurementListController = require('../controllers/procurementListController');
const { PROCUREMENT_LIST_ROLES } = require('../services/procurementListService');

const router = express.Router();

router.use(auth);
router.use(requireRole(PROCUREMENT_LIST_ROLES));

router.get('/current', procurementListController.getCurrentList);

router.post(
  '/current/create-orders',
  requireRole(['admin', 'purchase_manager']),
  procurementListController.createOrdersFromCurrentList
);

router.post(
  '/current/items',
  body('productId').isInt({ min: 1 }),
  body('requestedQuantity').isInt({ min: 1 }),
  body('observedStock').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body('notes').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('selectedSupplierId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('purchasePrice').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  procurementListController.addCurrentListItem
);

router.patch(
  '/current/items/:itemId',
  param('itemId').isInt({ min: 1 }),
  body('requestedQuantity').optional().isInt({ min: 1 }),
  body('observedStock').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }),
  body('notes').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  body('selectedSupplierId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('purchasePrice').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
  procurementListController.updateCurrentListItem
);

router.delete(
  '/current/items/:itemId',
  param('itemId').isInt({ min: 1 }),
  procurementListController.deleteCurrentListItem
);

module.exports = router;
