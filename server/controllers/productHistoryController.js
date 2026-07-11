const {
  PriceHistory,
  Product,
  ProductActionHistory,
  ProductAsset,
  ProductRevisionRequest,
  StockHistory,
  User,
} = require('../models');
const {
  PRODUCT_PERMISSION_ACTIONS,
  assertProductActionAllowed,
} = require('../constants/productPermissions');
const {
  mergeProductTimeline,
} = require('../services/productHistoryService');

const actorInclude = (as) => ({
  model: User,
  as,
  attributes: ['id', 'name', 'email', 'role'],
  required: false,
});

function parseBoundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

async function getProductHistory(req, res) {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, isActive: true },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Товар не найден' });
    }

    assertProductActionAllowed({
      user: req.user,
      product,
      action: PRODUCT_PERMISSION_ACTIONS.VIEW_HISTORY,
    });

    const page = parseBoundedInteger(req.query.page, 1, 1, 100);
    const limit = parseBoundedInteger(req.query.limit, 50, 1, 100);
    const sourceWindow = page * limit;

    const [actions, prices, stocks, revisions] = await Promise.all([
      ProductActionHistory.findAndCountAll({
        where: { productId: product.id },
        include: [actorInclude('actor')],
        order: [['createdAt', 'DESC']],
        limit: sourceWindow,
        distinct: true,
      }),
      PriceHistory.findAndCountAll({
        where: { productId: product.id },
        include: [actorInclude('changer')],
        order: [['changedAt', 'DESC']],
        limit: sourceWindow,
        distinct: true,
      }),
      StockHistory.findAndCountAll({
        where: { productId: product.id },
        include: [actorInclude('user')],
        order: [['createdAt', 'DESC']],
        limit: sourceWindow,
        distinct: true,
      }),
      ProductRevisionRequest.findAll({
        where: { productId: product.id },
        include: [{
          model: ProductAsset,
          as: 'attachments',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'originalName', 'filePath', 'mimeType'],
        }],
        order: [['createdAt', 'DESC']],
        limit: sourceWindow,
      }),
    ]);

    const timeline = mergeProductTimeline({
      actions: actions.rows,
      prices: prices.rows,
      stocks: stocks.rows,
      revisions,
      page,
      limit,
    });
    const total = actions.count + prices.count + stocks.count;

    return res.json({
      success: true,
      data: {
        events: timeline.events,
        pagination: {
          ...timeline.pagination,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error.status === 403 || error.statusCode === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error('Error loading product history:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при загрузке истории товара',
    });
  }
}

module.exports = { getProductHistory };
