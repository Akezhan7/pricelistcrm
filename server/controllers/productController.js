const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  Product,
  Supplier,
  ProductSupplier,
  ProductVariation,
  PriceHistory,
  Category,
  User,
  ProductActionHistory,
  ProductAsset,
  ProductRevisionRequest,
  ProductMarketplaceListing,
  sequelize,
} = require('../models');
const path = require('path');
const fs = require('fs').promises;
const { createPriceHistoryRecord } = require('./priceHistoryController');
const {
  PRODUCT_LIFECYCLE_ACTIONS,
  PRODUCT_LIFECYCLE_STATUS_VALUES,
} = require('../constants/productLifecycle');
const {
  createLifecycleActionUpdate,
} = require('../services/productLifecycleService');
const {
  buildBulkAssignDesignerPlan,
  buildDesignerAssignedHistoryEntry,
} = require('../services/productBulkLifecycleService');
const {
  buildProductDraftData,
} = require('../services/productDraftService');
const {
  PRODUCT_ASSET_TYPES,
  buildProductAssetData,
} = require('../services/productAssetService');
const {
  buildProductWorkflowQuery,
  resolveProductWorkflowItem,
} = require('../services/productWorkflowService');
const {
  PRODUCT_REVISION_STATUSES,
  buildApproveReviewPlan,
  buildRequestRevisionPlan,
  buildResubmitRevisionPlan,
  buildSubmitReviewPlan,
} = require('../services/productReviewService');
const {
  MARKETPLACE_KEYS,
  buildKaspiLegacyProductUpdate,
  buildMarketplaceListingData,
  buildMarketplaceListingUpdate,
  buildMarketplacePlacementReadyPlan,
} = require('../services/productMarketplaceService');

const productUserInclude = [
  {
    model: User,
    as: 'assignedTo',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
  {
    model: User,
    as: 'designer',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
  {
    model: User,
    as: 'marketplaceManager',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
];

const productAssetInclude = [
  {
    model: User,
    as: 'uploader',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
];

const productRevisionInclude = [
  {
    model: User,
    as: 'requester',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
  {
    model: User,
    as: 'assignedDesigner',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
  {
    model: ProductAsset,
    as: 'attachments',
    where: { isActive: true },
    required: false,
    include: productAssetInclude,
  },
];

const productMarketplaceInclude = [
  {
    model: User,
    as: 'manager',
    attributes: ['id', 'name', 'email', 'role'],
    required: false,
  },
];

async function removeUploadedFile(file) {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch {
    // Soft failure: database state is the source of truth, orphan cleanup can be handled separately.
  }
}

function canManageProductAssets(user, product) {
  if (!user || !product) return false;
  if (user.role === 'admin') return true;

  return user.role === 'designer' && Number(product.designerId) === Number(user.id);
}

function canManageMarketplaceListings(user) {
  return user?.role === 'admin' || user?.role === 'marketplace_manager';
}

async function syncKaspiLegacyFields({
  product,
  listingData,
  actor,
  transaction,
  now = new Date(),
}) {
  const legacyUpdate = buildKaspiLegacyProductUpdate(listingData);
  const legacyKeys = Object.keys(legacyUpdate);

  if (legacyKeys.length === 0) return;

  const oldSellingPrice = parseFloat(product.sellingPrice);
  await product.update(legacyUpdate, { transaction });

  if (
    Object.prototype.hasOwnProperty.call(legacyUpdate, 'sellingPrice') &&
    parseFloat(legacyUpdate.sellingPrice) !== oldSellingPrice
  ) {
    await PriceHistory.create(
      {
        productId: product.id,
        oldPrice: oldSellingPrice,
        newPrice: legacyUpdate.sellingPrice,
        priceType: 'sellingPrice',
        changeReason: 'Marketplace listing update',
        changedBy: actor.id,
        changedAt: now,
      },
      { transaction }
    );
  }
}

async function getNextDraftSequenceForDate(date) {
  const datePrefix = generateDraftDatePrefix(date);
  const draftPrefix = `DRAFT-${datePrefix}-`;

  const lastDraft = await Product.findOne({
    where: {
      article: {
        [Op.like]: `${draftPrefix}%`,
      },
    },
    order: [['article', 'DESC']],
    attributes: ['article'],
  });

  if (!lastDraft) return 1;

  const lastSequence = Number(String(lastDraft.article).replace(draftPrefix, ''));
  return Number.isInteger(lastSequence) ? lastSequence + 1 : 1;
}

function generateDraftDatePrefix(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

const getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 50, excludeSupplierId, lifecycleStatus } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      isActive: true,
    };

    if (lifecycleStatus) {
      if (!PRODUCT_LIFECYCLE_STATUS_VALUES.includes(lifecycleStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid lifecycle status',
        });
      }

      whereClause.lifecycleStatus = lifecycleStatus;
    }

    if (excludeSupplierId) {
      const supplierId = parseInt(excludeSupplierId, 10);
      if (!Number.isNaN(supplierId)) {
        const linkedRows = await ProductSupplier.findAll({
          where: { supplierId },
          attributes: ['productId'],
          raw: true,
        });
        const linkedIds = linkedRows.map((row) => row.productId);
        if (linkedIds.length > 0) {
          whereClause.id = { [Op.notIn]: linkedIds };
        }
      }
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { article: { [Op.like]: `%${search}%` } },
        { internalName: { [Op.like]: `%${search}%` } },
        { kaspiName: { [Op.like]: `%${search}%` } },
        { kaspiArticle: { [Op.like]: `%${search}%` } },
      ];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
        ...productUserInclude,
      ],
      distinct: true,
      subQuery: false,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']], // Новые товары первыми
    });

    res.json({
      success: true,
      data: {
        products: products.rows,
        pagination: {
          total: products.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(products.count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении товаров',
    });
  }
};

const getProductWorkflowQueue = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const offset = (parsedPage - 1) * parsedLimit;

    const workflowQuery = buildProductWorkflowQuery({
      user: req.user,
      filters: req.query,
    });

    const whereClause = { ...workflowQuery.where };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { article: { [Op.like]: `%${search}%` } },
        { internalName: { [Op.like]: `%${search}%` } },
        { kaspiName: { [Op.like]: `%${search}%` } },
        { kaspiArticle: { [Op.like]: `%${search}%` } },
      ];
    }

    const products = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
        ...productUserInclude,
      ],
      distinct: true,
      subQuery: false,
      limit: parsedLimit,
      offset,
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        products: products.rows.map((product) =>
          resolveProductWorkflowItem({ product, user: req.user })
        ),
        workflow: {
          scope: workflowQuery.scope,
          canUseExtendedFilters: workflowQuery.canUseExtendedFilters,
        },
        pagination: {
          total: products.count,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(products.count / parsedLimit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения очереди товаров:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении очереди товаров',
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        ...productUserInclude,
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    res.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении товара',
    });
  }
};

const getProductAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ where: { id, isActive: true } });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const assets = await ProductAsset.findAll({
      where: {
        productId: product.id,
        isActive: true,
      },
      include: productAssetInclude,
      order: [
        ['assetType', 'ASC'],
        ['sortOrder', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    return res.json({
      success: true,
      data: { assets },
    });
  } catch (error) {
    console.error('Error loading product assets:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading product assets',
    });
  }
};

const createProductAsset = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const { id } = req.params;
    const { assetType, notes, sortOrder } = req.body;

    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      await removeUploadedFile(req.file);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!canManageProductAssets(req.user, product)) {
      await transaction.rollback();
      transactionFinished = true;
      await removeUploadedFile(req.file);
      return res.status(403).json({
        success: false,
        message: 'Only admin or assigned designer can upload product assets',
      });
    }

    const assetData = buildProductAssetData({
      productId: product.id,
      uploadedBy: req.user.id,
      assetType,
      file: req.file,
      notes,
      sortOrder,
    });

    const asset = await ProductAsset.create(assetData, { transaction });

    if (asset.assetType === PRODUCT_ASSET_TYPES.PRODUCT_PHOTO && !product.image) {
      await product.update({ image: asset.filePath }, { transaction });
    }

    await ProductActionHistory.create(
      {
        productId: product.id,
        actorId: req.user.id,
        actionType: 'content_uploaded',
        fromStatus: product.lifecycleStatus,
        toStatus: product.lifecycleStatus,
        message: 'Product content asset uploaded',
        metadata: {
          assetId: asset.id,
          assetType: asset.assetType,
          filePath: asset.filePath,
          originalName: asset.originalName,
        },
        createdAt: new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    transactionFinished = true;

    const createdAsset = await ProductAsset.findOne({
      where: { id: asset.id },
      include: productAssetInclude,
    });

    return res.status(201).json({
      success: true,
      message: 'Product asset uploaded',
      data: { asset: createdAsset },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    await removeUploadedFile(req.file);

    if (/unsupported asset type|file is required|file type is not allowed|file is too large/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error uploading product asset:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading product asset',
    });
  }
};

const deleteProductAsset = async (req, res) => {
  try {
    const { id, assetId } = req.params;

    const product = await Product.findOne({ where: { id, isActive: true } });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!canManageProductAssets(req.user, product)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or assigned designer can delete product assets',
      });
    }

    const asset = await ProductAsset.findOne({
      where: {
        id: assetId,
        productId: product.id,
        isActive: true,
      },
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Product asset not found',
      });
    }

    await asset.update({ isActive: false });

    return res.json({
      success: true,
      message: 'Product asset deleted',
    });
  } catch (error) {
    console.error('Error deleting product asset:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting product asset',
    });
  }
};

const assignDesignerToProduct = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { designerId } = req.body;

    const product = await Product.findOne({ where: { id, isActive: true }, transaction });
    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const designer = await User.findOne({
      where: {
        id: designerId,
        role: 'designer',
        isActive: true,
      },
      transaction,
    });

    if (!designer) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Designer not found',
      });
    }

    const now = new Date();
    const updateData = createLifecycleActionUpdate({
      action: PRODUCT_LIFECYCLE_ACTIONS.ASSIGN_DESIGNER,
      actor: req.user,
      product,
      payload: { designerId },
      now,
    });

    await product.update(updateData, { transaction });
    await ProductActionHistory.create(
      buildDesignerAssignedHistoryEntry({
        product,
        actor: req.user,
        designer,
        update: updateData,
        now,
        bulk: false,
      }),
      { transaction }
    );

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        ...productUserInclude,
      ],
    });

    return res.json({
      success: true,
      message: 'Designer assigned',
      data: { product: updatedProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|is required|not supported/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error assigning designer:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while assigning designer',
    });
  }
};

const bulkAssignDesignerToProducts = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { productIds, designerId } = req.body;

    const designer = await User.findOne({
      where: {
        id: designerId,
        role: 'designer',
        isActive: true,
      },
      transaction,
    });

    const requestedProductIds = Array.from(new Set(productIds.map((id) => Number(id))));
    const products = await Product.findAll({
      where: {
        id: { [Op.in]: requestedProductIds },
        isActive: true,
      },
      transaction,
      lock: true,
    });

    const plan = buildBulkAssignDesignerPlan({
      actor: req.user,
      designer,
      productIds,
      products,
      now: new Date(),
    });

    const productsById = new Map(products.map((product) => [Number(product.id), product]));
    for (const item of plan.updates) {
      const product = productsById.get(item.productId);
      await product.update(item.update, { transaction });
    }

    await ProductActionHistory.bulkCreate(plan.historyEntries, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const updatedProducts = await Product.findAll({
      where: { id: { [Op.in]: plan.productIds } },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        ...productUserInclude,
      ],
    });

    const updatedProductsById = new Map(
      updatedProducts.map((product) => [Number(product.id), product])
    );

    return res.json({
      success: true,
      message: 'Designer assigned to selected products',
      data: {
        products: plan.productIds
          .map((productId) => updatedProductsById.get(productId))
          .filter(Boolean),
        assignedCount: plan.productIds.length,
      },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (
      /not allowed|is required|not supported|productIds|designer|not all selected|only products/i.test(
        error.message
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error assigning designer in bulk:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while assigning designer in bulk',
    });
  }
};

const submitProductContent = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const { id } = req.params;

    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const assetsCount = await ProductAsset.count({
      where: {
        productId: product.id,
        isActive: true,
      },
      transaction,
    });

    if (assetsCount === 0) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Upload at least one product asset before marking content as created',
      });
    }

    const now = new Date();
    const updateData = createLifecycleActionUpdate({
      action: PRODUCT_LIFECYCLE_ACTIONS.SUBMIT_CONTENT,
      actor: req.user,
      product,
      now,
    });

    await product.update(updateData, { transaction });
    await ProductActionHistory.create(
      {
        productId: product.id,
        actorId: req.user.id,
        actionType: 'content_created',
        fromStatus: product.lifecycleStatus,
        toStatus: updateData.lifecycleStatus,
        message: 'Product content marked as created',
        metadata: { assetsCount },
        createdAt: now,
      },
      { transaction }
    );

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        ...productUserInclude,
      ],
    });

    return res.json({
      success: true,
      message: 'Product content created',
      data: { product: updatedProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted|assigned designer/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|is required|not supported/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error submitting product content:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting product content',
    });
  }
};

const submitProductReview = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const plan = buildSubmitReviewPlan({
      actor: req.user,
      product,
      now: new Date(),
    });

    await product.update(plan.productUpdate, { transaction });
    await ProductActionHistory.create(plan.historyEntry, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: productUserInclude,
    });

    return res.json({
      success: true,
      message: 'Product submitted for review',
      data: { product: updatedProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted|assigned designer/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|is required|not supported/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error submitting product review:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting product review',
    });
  }
};

const approveProductReview = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const plan = buildApproveReviewPlan({
      actor: req.user,
      product,
      now: new Date(),
    });

    await product.update(plan.productUpdate, { transaction });
    await ProductActionHistory.create(plan.historyEntry, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: productUserInclude,
    });

    return res.json({
      success: true,
      message: 'Product review approved',
      data: { product: updatedProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|is required|not supported/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error approving product review:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while approving product review',
    });
  }
};

const requestProductRevision = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      await removeUploadedFile(req.file);
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { comment } = req.body;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      await removeUploadedFile(req.file);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const now = new Date();
    const plan = buildRequestRevisionPlan({
      actor: req.user,
      product,
      comment,
      now,
    });

    await product.update(plan.productUpdate, { transaction });
    const revisionRequest = await ProductRevisionRequest.create(plan.revisionRequestData, {
      transaction,
    });

    let attachment = null;
    if (req.file) {
      const assetData = buildProductAssetData({
        productId: product.id,
        uploadedBy: req.user.id,
        assetType: PRODUCT_ASSET_TYPES.REVISION_ATTACHMENT,
        file: req.file,
        notes: plan.revisionRequestData.comment,
        revisionRequestId: revisionRequest.id,
      });
      attachment = await ProductAsset.create(assetData, { transaction });
    }

    await ProductActionHistory.create(
      {
        ...plan.historyEntry,
        metadata: {
          ...plan.historyEntry.metadata,
          revisionRequestId: revisionRequest.id,
          attachmentAssetId: attachment?.id || null,
        },
      },
      { transaction }
    );

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: productUserInclude,
    });
    const createdRevision = await ProductRevisionRequest.findOne({
      where: { id: revisionRequest.id },
      include: productRevisionInclude,
    });

    return res.status(201).json({
      success: true,
      message: 'Product revision requested',
      data: {
        product: updatedProduct,
        revisionRequest: createdRevision,
      },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    await removeUploadedFile(req.file);

    if (/not permitted/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|is required|not supported|file type is not allowed|file is too large/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error requesting product revision:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while requesting product revision',
    });
  }
};

const resubmitProductRevision = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const { id } = req.params;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const openRevisionRequest = await ProductRevisionRequest.findOne({
      where: {
        productId: product.id,
        status: PRODUCT_REVISION_STATUSES.OPEN,
      },
      order: [['createdAt', 'DESC']],
      transaction,
      lock: true,
    });

    if (!openRevisionRequest) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'No open revision request found for this product',
      });
    }

    const plan = buildResubmitRevisionPlan({
      actor: req.user,
      product,
      openRevisionRequest,
      now: new Date(),
    });

    await product.update(plan.productUpdate, { transaction });
    await openRevisionRequest.update(plan.revisionUpdate, { transaction });
    await ProductActionHistory.create(plan.historyEntry, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: productUserInclude,
    });

    return res.json({
      success: true,
      message: 'Product revision resubmitted',
      data: { product: updatedProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted|assigned designer/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|is required|not supported/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error resubmitting product revision:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while resubmitting product revision',
    });
  }
};

const getProductRevisionRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ where: { id, isActive: true } });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const revisionRequests = await ProductRevisionRequest.findAll({
      where: { productId: product.id },
      include: productRevisionInclude,
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: { revisionRequests },
    });
  } catch (error) {
    console.error('Error loading product revision requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading product revision requests',
    });
  }
};

const getProductMarketplaceListings = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ where: { id, isActive: true } });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const listings = await ProductMarketplaceListing.findAll({
      where: { productId: product.id },
      include: productMarketplaceInclude,
      order: [['marketplace', 'ASC']],
    });

    return res.json({
      success: true,
      data: { listings },
    });
  } catch (error) {
    console.error('Error loading marketplace listings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while loading marketplace listings',
    });
  }
};

const saveProductMarketplaceListing = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!canManageMarketplaceListings(req.user)) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(403).json({
        success: false,
        message: 'Only admin or marketplace manager can edit marketplace listings',
      });
    }

    const listingData = buildMarketplaceListingData({
      productId: product.id,
      actor: req.user,
      payload: req.body,
    });

    const existingListing = await ProductMarketplaceListing.findOne({
      where: {
        productId: product.id,
        marketplace: listingData.marketplace,
      },
      transaction,
      lock: true,
    });

    const now = new Date();
    let listing;
    if (existingListing) {
      await existingListing.update(listingData, { transaction });
      listing = existingListing;
    } else {
      listing = await ProductMarketplaceListing.create(listingData, { transaction });
    }

    await syncKaspiLegacyFields({
      product,
      listingData,
      actor: req.user,
      transaction,
      now,
    });

    await ProductActionHistory.create(
      {
        productId: product.id,
        actorId: req.user.id,
        actionType: 'marketplace_updated',
        fromStatus: product.lifecycleStatus,
        toStatus: product.lifecycleStatus,
        message: 'Marketplace listing updated',
        metadata: {
          marketplaceListingId: listing.id,
          marketplace: listing.marketplace,
          status: listing.status,
          sku: listing.sku,
        },
        createdAt: now,
      },
      { transaction }
    );

    await transaction.commit();
    transactionFinished = true;

    const savedListing = await ProductMarketplaceListing.findOne({
      where: { id: listing.id },
      include: productMarketplaceInclude,
    });

    return res.status(existingListing ? 200 : 201).json({
      success: true,
      message: 'Marketplace listing saved',
      data: { listing: savedListing },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted|Only admin/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/Unsupported|must be|is required/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error saving marketplace listing:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving marketplace listing',
    });
  }
};

const updateProductMarketplaceListing = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { id, listingId } = req.params;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!canManageMarketplaceListings(req.user)) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(403).json({
        success: false,
        message: 'Only admin or marketplace manager can edit marketplace listings',
      });
    }

    const listing = await ProductMarketplaceListing.findOne({
      where: {
        id: listingId,
        productId: product.id,
      },
      transaction,
      lock: true,
    });

    if (!listing) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found',
      });
    }

    const updateData = buildMarketplaceListingUpdate({
      actor: req.user,
      payload: req.body,
    });

    await listing.update(updateData, { transaction });
    const mergedListingData = {
      ...listing.toJSON(),
      ...updateData,
    };
    const now = new Date();

    await syncKaspiLegacyFields({
      product,
      listingData: mergedListingData,
      actor: req.user,
      transaction,
      now,
    });

    await ProductActionHistory.create(
      {
        productId: product.id,
        actorId: req.user.id,
        actionType: 'marketplace_updated',
        fromStatus: product.lifecycleStatus,
        toStatus: product.lifecycleStatus,
        message: 'Marketplace listing updated',
        metadata: {
          marketplaceListingId: listing.id,
          marketplace: listing.marketplace,
          status: listing.status,
          sku: listing.sku,
        },
        createdAt: now,
      },
      { transaction }
    );

    await transaction.commit();
    transactionFinished = true;

    const updatedListing = await ProductMarketplaceListing.findOne({
      where: { id: listing.id },
      include: productMarketplaceInclude,
    });

    return res.json({
      success: true,
      message: 'Marketplace listing updated',
      data: { listing: updatedListing },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted|Only admin/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/Unsupported|must be|is required/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error updating marketplace listing:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating marketplace listing',
    });
  }
};

const markProductPlacementReady = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const { id } = req.params;
    const product = await Product.findOne({
      where: { id, isActive: true },
      transaction,
      lock: true,
    });

    if (!product) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const kaspiListing = await ProductMarketplaceListing.findOne({
      where: {
        productId: product.id,
        marketplace: MARKETPLACE_KEYS.KASPI,
      },
      transaction,
      lock: true,
    });

    const now = new Date();
    const plan = buildMarketplacePlacementReadyPlan({
      actor: req.user,
      product,
      kaspiListing,
      now,
    });

    await product.update(plan.productUpdate, { transaction });
    await ProductActionHistory.create(plan.historyEntry, { transaction });

    await transaction.commit();
    transactionFinished = true;

    const updatedProduct = await Product.findOne({
      where: { id: product.id },
      include: productUserInclude,
    });

    return res.json({
      success: true,
      message: 'Marketplace placement marked as ready',
      data: { product: updatedProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
      transactionFinished = true;
    }

    if (/not permitted/i.test(error.message)) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (/not allowed|required|published|SKU|price|name/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error marking marketplace placement ready:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while marking marketplace placement ready',
    });
  }
};

const createProductDraft = async (req, res) => {
  const transaction = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      transactionFinished = true;
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { name, costPrice, supplierId, supplierPrice, comment } = req.body;
    const now = new Date();
    const sequence = await getNextDraftSequenceForDate(now);

    const draftData = buildProductDraftData({
      name,
      costPrice,
      comment,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      actorId: req.user.id,
      now,
      sequence,
    });

    const product = await Product.create(draftData, { transaction });

    if (supplierId) {
      const supplier = await Supplier.findOne({
        where: {
          id: supplierId,
          isActive: true,
        },
        transaction,
      });

      if (!supplier) {
        await transaction.rollback();
        transactionFinished = true;
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      await ProductSupplier.create({
        productId: product.id,
        supplierId: supplier.id,
        supplierPrice: supplierPrice !== undefined && supplierPrice !== ''
          ? Number(supplierPrice)
          : product.costPrice,
        quantity: 0,
        isAvailable: true,
        notes: comment || '',
      }, { transaction });
    }

    await transaction.commit();
    transactionFinished = true;

    const createdProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        ...productUserInclude,
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Product draft created',
      data: { product: createdProduct },
    });
  } catch (error) {
    if (!transactionFinished) {
      await transaction.rollback();
    }

    if (/name is required|costPrice must/i.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error('Error creating product draft:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating product draft',
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { name, article, costPrice, sellingPrice, description, internalName, kaspiName, kaspiArticle, currentStock, minStock, categoryId } = req.body;
    // suppliers may be sent as JSON string in multipart/form-data. Accept both array and JSON string.
    let suppliers = req.body.suppliers;
    if (suppliers && typeof suppliers === 'string') {
      try {
        suppliers = JSON.parse(suppliers);
      } catch (e) {
        suppliers = null;
      }
    }

    // Проверка уникальности артикула
    const existingProduct = await Product.findOne({ where: { article } });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Товар с таким артикулом уже существует',
      });
    }

    // Проверяем существование категории
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Категория не найдена',
        });
      }
    }

    const product = await Product.create({
      name,
      article,
      costPrice,
      sellingPrice,
      description,
      internalName: internalName || null,
      kaspiName: kaspiName || null,
      kaspiArticle: kaspiArticle || null,
      currentStock: currentStock !== undefined ? parseInt(currentStock) : 0,
      minStock: minStock !== undefined ? parseInt(minStock) : 0,
      categoryId: categoryId || null,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    });

    // Добавление поставщиков, если они указаны
    if (suppliers && Array.isArray(suppliers)) {
      const supplierData = suppliers.map(s => ({
        productId: product.id,
        supplierId: s.id,
        supplierPrice: s.price,
        quantity: s.quantity || 0,
        isAvailable: s.isAvailable !== false,
        notes: s.notes || '',
      }));

      await ProductSupplier.bulkCreate(supplierData);
    }

    // Получение созданного товара с поставщиками
    const createdProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Товар успешно создан',
      data: { product: createdProduct },
    });
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании товара',
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { 
      name, 
      article, 
      internalName,
      kaspiName,
      kaspiArticle,
      costPrice, 
      sellingPrice, 
      currentStock,
      minStock,
      categoryId,
      description 
    } = req.body;
    // suppliers may be sent as JSON string in multipart/form-data. Accept both array and JSON string.
    let suppliers = req.body.suppliers;
    if (suppliers && typeof suppliers === 'string') {
      try {
        suppliers = JSON.parse(suppliers);
      } catch (e) {
        suppliers = null;
      }
    }

    const product = await Product.findOne({ where: { id, isActive: true } });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Проверка уникальности артикула (кроме текущего товара)
    if (article && article !== product.article) {
      const existingProduct = await Product.findOne({ where: { article } });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Товар с таким артикулом уже существует',
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (article) updateData.article = article;
    if (internalName !== undefined) updateData.internalName = internalName;
    if (kaspiName !== undefined) updateData.kaspiName = kaspiName;
    if (kaspiArticle !== undefined) updateData.kaspiArticle = kaspiArticle;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
    if (currentStock !== undefined) updateData.currentStock = parseInt(currentStock) || 0;
    if (minStock !== undefined) updateData.minStock = parseInt(minStock) || 0;
    if (categoryId !== undefined) updateData.categoryId = categoryId ? parseInt(categoryId) : null;
    if (description !== undefined) updateData.description = description;

    // Обработка загрузки нового изображения
    if (req.file) {
      // Удаление старого изображения
      if (product.image) {
        try {
          // product.image хранится как '/uploads/filename'.
          // path.join с абсолютным путём может привести к неверному результату,
          // поэтому используем process.cwd() и формируем относительный путь.
          const oldImagePath = path.resolve(process.cwd(), '.' + product.image);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.log('Не удалось удалить старое изображение:', error.message);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    // Сохранение старых цен ДО обновления для истории
    const oldCostPrice = parseFloat(product.costPrice);
    const oldSellingPrice = parseFloat(product.sellingPrice);
    
    // Проверка изменений цен
    const costPriceChanged = costPrice !== undefined && parseFloat(costPrice) !== oldCostPrice;
    const sellingPriceChanged = sellingPrice !== undefined && parseFloat(sellingPrice) !== oldSellingPrice;

    // Обновление товара
    await product.update(updateData);

    // Создание записей в истории цен ПОСЛЕ обновления (используем сохранённые старые цены)
    if (costPriceChanged) {
      await createPriceHistoryRecord({
        productId: product.id,
        oldPrice: oldCostPrice,
        newPrice: costPrice,
        priceType: 'costPrice',
        changeReason: 'Ручное обновление через редактирование товара',
        changedBy: req.user.id,
      });
    }

    if (sellingPriceChanged) {
      await createPriceHistoryRecord({
        productId: product.id,
        oldPrice: oldSellingPrice,
        newPrice: sellingPrice,
        priceType: 'sellingPrice',
        changeReason: 'Ручное обновление через редактирование товара',
        changedBy: req.user.id,
      });
    }

    // Обновление поставщиков
    if (suppliers && Array.isArray(suppliers)) { // ИСПРАВЛЕНО: Управил отступ
      // Удаление существующих связей
      await ProductSupplier.destroy({ where: { productId: id } });

      // Создание новых связей
      const supplierData = suppliers.map(s => ({
        productId: id,
        supplierId: s.id,
        supplierPrice: s.price,
        quantity: s.quantity || 0,
        isAvailable: s.isAvailable !== false,
        notes: s.notes || '',
      }));

      await ProductSupplier.bulkCreate(supplierData);
    }

    // Получение обновленного товара
    const updatedProduct = await Product.findOne({
      where: { id },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
        },
      ],
    });

    res.json({
      success: true,
      message: 'Товар успешно обновлен',
      data: { product: updatedProduct },
    });
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении товара',
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ where: { id, isActive: true } });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Мягкое удаление
    await product.update({ isActive: false });

    res.json({
      success: true,
      message: 'Товар успешно удален',
    });
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении товара',
    });
  }
};

// Добавить поставщика к товару
const addSupplierToProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { supplierId, supplierPrice, quantity = 0, isAvailable = true, notes = '' } = req.body;

    // Проверяем существование товара
    const product = await Product.findOne({ where: { id: productId, isActive: true } });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Проверяем существование поставщика
    const supplier = await Supplier.findOne({ where: { id: supplierId, isActive: true } });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден',
      });
    }

    // Проверяем, не существует ли уже такая связь
    const existingRelation = await ProductSupplier.findOne({
      where: { productId, supplierId },
    });
    
    if (existingRelation) {
      return res.status(400).json({
        success: false,
        message: 'Этот поставщик уже привязан к товару',
      });
    }

    // Создаем связь
    await ProductSupplier.create({
      productId,
      supplierId,
      supplierPrice,
      quantity,
      isAvailable,
      notes,
    });

    // Получаем обновленный товар с поставщиками
    const updatedProduct = await Product.findOne({
      where: { id: productId },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: 'Поставщик успешно добавлен к товару',
      data: { product: updatedProduct },
    });
  } catch (error) {
    console.error('Ошибка добавления поставщика к товару:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при добавлении поставщика',
    });
  }
};

// Удалить поставщика из товара (только связь, не самого поставщика)
const removeSupplierFromProduct = async (req, res) => {
  try {
    const { productId, supplierId } = req.params;

    // Проверяем существование связи
    const relation = await ProductSupplier.findOne({
      where: { productId, supplierId },
    });

    if (!relation) {
      return res.status(404).json({
        success: false,
        message: 'Связь между товаром и поставщиком не найдена',
      });
    }

    // Удаляем связь
    await relation.destroy();

    // Получаем обновленный товар
    const updatedProduct = await Product.findOne({
      where: { id: productId, isActive: true },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: 'Поставщик успешно удален из товара',
      data: { product: updatedProduct },
    });
  } catch (error) {
    console.error('Ошибка удаления поставщика из товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении поставщика',
    });
  }
};

// Обновить данные поставщика для товара
const updateProductSupplier = async (req, res) => {
  try {
    const { productId, supplierId } = req.params;
    const { supplierPrice, quantity, isAvailable, notes } = req.body;

    // Найти связь
    const relation = await ProductSupplier.findOne({
      where: { productId, supplierId },
    });

    if (!relation) {
      return res.status(404).json({
        success: false,
        message: 'Связь между товаром и поставщиком не найдена',
      });
    }

    // Обновляем данные
    const updateData = {};
    if (supplierPrice !== undefined) updateData.supplierPrice = supplierPrice;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (notes !== undefined) updateData.notes = notes;

    await relation.update(updateData);

    // Получаем обновленный товар
    const updatedProduct = await Product.findOne({
      where: { id: productId, isActive: true },
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: 'Данные поставщика для товара обновлены',
      data: { product: updatedProduct },
    });
  } catch (error) {
    console.error('Ошибка обновления данных поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении данных поставщика',
    });
  }
};

// Добавить вариацию товара
const addProductVariation = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, value, price, costPrice, sku, sortOrder = 0 } = req.body;

    // Проверяем существование товара
    const product = await Product.findOne({ where: { id: productId, isActive: true } });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Проверяем уникальность SKU, если он указан
    if (sku) {
      const existingSku = await ProductVariation.findOne({ where: { sku } });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'Вариация с таким артикулом уже существует',
        });
      }
    }

    const variation = await ProductVariation.create({
      productId,
      name,
      value,
      price,
      costPrice,
      sku,
      sortOrder,
    });

    res.status(201).json({
      success: true,
      message: 'Вариация товара успешно создана',
      data: { variation },
    });
  } catch (error) {
    console.error('Ошибка создания вариации товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании вариации',
    });
  }
};

// Получить вариации товара
const getProductVariations = async (req, res) => {
  try {
    const { productId } = req.params;

    const variations = await ProductVariation.findAll({
      where: { productId, isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    res.json({
      success: true,
      data: { variations },
    });
  } catch (error) {
    console.error('Ошибка получения вариаций товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении вариаций',
    });
  }
};

// Обновить вариацию товара
const updateProductVariation = async (req, res) => {
  try {
    const { productId, variationId } = req.params;
    const { name, value, price, costPrice, sku, sortOrder } = req.body;

    // Найти вариацию
    const variation = await ProductVariation.findOne({
      where: { id: variationId, productId, isActive: true },
    });

    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Вариация товара не найдена',
      });
    }

    // Проверить уникальность SKU, если он изменился
    if (sku && sku !== variation.sku) {
      const existingSku = await ProductVariation.findOne({ 
        where: { 
          sku, 
          id: { [Op.ne]: variationId } // исключаем текущую вариацию
        } 
      });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'Вариация с таким артикулом уже существует',
        });
      }
    }

    // Обновить данные
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (value !== undefined) updateData.value = value;
    if (price !== undefined) updateData.price = price;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (sku !== undefined) updateData.sku = sku;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await variation.update(updateData);

    res.json({
      success: true,
      message: 'Вариация товара успешно обновлена',
      data: { variation },
    });
  } catch (error) {
    console.error('Ошибка обновления вариации товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении вариации',
    });
  }
};

// Удалить вариацию товара (мягкое удаление)
const deleteProductVariation = async (req, res) => {
  try {
    const { productId, variationId } = req.params;

    // Найти вариацию
    const variation = await ProductVariation.findOne({
      where: { id: variationId, productId, isActive: true },
    });

    if (!variation) {
      return res.status(404).json({
        success: false,
        message: 'Вариация товара не найдена',
      });
    }

    // Мягкое удаление
    await variation.update({ isActive: false });

    res.json({
      success: true,
      message: 'Вариация товара успешно удалена',
    });
  } catch (error) {
    console.error('Ошибка удаления вариации товара:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении вариации',
    });
  }
};

/**
 * Вспомогательная функция для определения статуса остатков товара с детальной аналитикой
 * @param {number} currentStock - Текущий остаток
 * @param {number} minStock - Минимальный остаток
 * @returns {object} - Статус с деталями: status, color, fillPercentage, needsPurchase, recommendation
 */
function getStockStatus(currentStock, minStock) {
  const status = {
    status: 'good',
    color: 'green',
    fillPercentage: 100,
    needsPurchase: false,
    recommendation: 'Достаточный запас',
    urgency: 'low', // low, medium, high, critical
  };

  // Критический уровень - товар закончился
  if (currentStock === 0) {
    status.status = 'critical';
    status.color = 'red';
    status.fillPercentage = 0;
    status.needsPurchase = true;
    status.recommendation = 'СРОЧНО! Товар закончился';
    status.urgency = 'critical';
    return status;
  }

  // Низкий уровень - ниже минимального порога
  if (currentStock <= minStock) {
    const percentage = minStock > 0 ? Math.round((currentStock / minStock) * 100) : 0;
    status.status = 'low';
    status.color = 'yellow';
    status.fillPercentage = Math.min(percentage, 100);
    status.needsPurchase = true;
    status.recommendation = `Низкий остаток (${currentStock} шт). Необходима закупка`;
    status.urgency = 'high';
    return status;
  }

  // Средний уровень - между минимумом и удвоенным минимумом
  if (currentStock <= minStock * 2) {
    const percentage = minStock > 0 ? Math.round((currentStock / (minStock * 2)) * 100) : 100;
    status.status = 'medium';
    status.color = 'orange';
    status.fillPercentage = Math.min(percentage, 100);
    status.needsPurchase = false;
    status.recommendation = `Средний остаток (${currentStock} шт). Планируйте закупку`;
    status.urgency = 'medium';
    return status;
  }

  // Хороший уровень - выше удвоенного минимума
  const percentage = minStock > 0 ? Math.min(Math.round((currentStock / (minStock * 3)) * 100), 100) : 100;
  status.fillPercentage = percentage;
  status.recommendation = `Хороший запас (${currentStock} шт)`;
  status.urgency = 'low';

  return status;
}

/**
 * Получить товары с низким остатком
 * GET /api/products/low-stock
 */
const getLowStockProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, categoryId } = req.query;

    const whereClause = {
      isActive: true,
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Загружаем ВСЕ товары без пагинации, фильтрацию делаем после
    const allProducts = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    // Фильтруем товары с низким остатком
    const filteredProducts = allProducts.filter(product => {
      return product.currentStock === 0 || product.currentStock <= product.minStock;
    });

    // Добавляем статус критичности
    const productsWithStatus = filteredProducts.map(product => {
      const productData = product.toJSON();
      productData.stockStatus = getStockStatus(product.currentStock, product.minStock);
      productData.deficit = Math.max(0, product.minStock - product.currentStock);
      return productData;
    });

    // Сортируем по критичности: сначала нулевые остатки, потом по дефициту
    productsWithStatus.sort((a, b) => {
      if (a.currentStock === 0 && b.currentStock !== 0) return -1;
      if (a.currentStock !== 0 && b.currentStock === 0) return 1;
      return b.deficit - a.deficit; // По убыванию дефицита
    });

    // Применяем пагинацию после фильтрации и сортировки
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const paginatedProducts = productsWithStatus.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          total: productsWithStatus.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(productsWithStatus.length / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения товаров с низким остатком:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении товаров с низким остатком',
      error: error.message,
    });
  }
};

/**
 * Получить аналитику по остаткам
 * GET /api/products/stock-analytics
 */
const getStockAnalytics = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const whereClause = { isActive: true };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Получаем все товары с остатками
    const products = await Product.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'currentStock', 'minStock', 'categoryId'],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    // Рассчитываем статистику
    const analytics = {
      total: products.length,
      critical: 0,    // currentStock = 0
      low: 0,         // currentStock <= minStock
      medium: 0,      // currentStock <= minStock * 2
      good: 0,        // currentStock > minStock * 2
      totalValue: 0,
      lowStockValue: 0,
    };

    const criticalProducts = [];
    const lowProducts = [];

    products.forEach(product => {
      const status = getStockStatus(product.currentStock, product.minStock);

      switch (status) {
        case 'critical':
          analytics.critical++;
          criticalProducts.push({
            id: product.id,
            name: product.name,
            currentStock: product.currentStock,
            minStock: product.minStock,
            category: product.category?.name || 'Без категории',
          });
          break;
        case 'low':
          analytics.low++;
          lowProducts.push({
            id: product.id,
            name: product.name,
            currentStock: product.currentStock,
            minStock: product.minStock,
            deficit: product.minStock - product.currentStock,
            category: product.category?.name || 'Без категории',
          });
          break;
        case 'medium':
          analytics.medium++;
          break;
        case 'good':
          analytics.good++;
          break;
      }
    });

    // Сортируем критичные товары
    criticalProducts.sort((a, b) => a.name.localeCompare(b.name));
    lowProducts.sort((a, b) => b.deficit - a.deficit); // По убыванию дефицита

    res.json({
      success: true,
      data: {
        analytics,
        criticalProducts: criticalProducts.slice(0, 20), // Топ-20 критичных
        lowProducts: lowProducts.slice(0, 20), // Топ-20 с низким остатком
      },
    });
  } catch (error) {
    console.error('Ошибка получения аналитики остатков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении аналитики остатков',
      error: error.message,
    });
  }
};

/**
 * Обновить остаток товара вручную
 * PUT /api/products/:id/stock
 */
const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStock, minStock, notes } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Товар не найден',
      });
    }

    // Валидация
    if (currentStock !== undefined && (currentStock < 0 || !Number.isInteger(Number(currentStock)))) {
      return res.status(400).json({
        success: false,
        message: 'Текущий остаток должен быть неотрицательным целым числом',
      });
    }

    if (minStock !== undefined && (minStock < 0 || !Number.isInteger(Number(minStock)))) {
      return res.status(400).json({
        success: false,
        message: 'Минимальный остаток должен быть неотрицательным целым числом',
      });
    }

    const oldStock = product.currentStock;
    const updateData = {};

    if (currentStock !== undefined) {
      updateData.currentStock = currentStock;
    }

    if (minStock !== undefined) {
      updateData.minStock = minStock;
    }

    await product.update(updateData);

    // Логируем изменение (можно добавить таблицу StockHistory)
    console.log(`[STOCK UPDATE] Product #${id}: ${oldStock} -> ${product.currentStock} by User #${req.user.id}`);

    res.json({
      success: true,
      message: 'Остаток успешно обновлён',
      data: {
        product: {
          id: product.id,
          name: product.name,
          currentStock: product.currentStock,
          minStock: product.minStock,
          stockStatus: getStockStatus(product.currentStock, product.minStock),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка обновления остатка:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении остатка',
      error: error.message,
    });
  }
};

/**
 * Получить рекомендации для закупки (автоформирование списка закупа)
 * GET /api/products/purchase-suggestions
 */
const getPurchaseSuggestions = async (req, res) => {
  try {
    const { groupBy = 'supplier', categoryId } = req.query;

    const whereClause = {
      isActive: true,
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Получаем товары с низким остатком
    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'suppliers',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'isAvailable'],
          },
          where: { isActive: true },
          required: false,
        },
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    // Фильтруем товары с низким остатком (currentStock <= minStock)
    const lowStockProducts = products.filter(product => {
      return product.currentStock === 0 || product.currentStock <= product.minStock;
    });

    // Добавляем аналитику по каждому товару
    const productsWithDetails = lowStockProducts.map(product => {
      const stockStatus = getStockStatus(product.currentStock, product.minStock);
      const deficit = Math.max(0, product.minStock - product.currentStock);
      const recommendedQuantity = Math.max(deficit, Math.ceil(product.minStock * 1.5));

      return {
        id: product.id,
        name: product.name,
        internalName: product.internalName,
        article: product.article,
        currentStock: product.currentStock,
        minStock: product.minStock,
        deficit,
        recommendedQuantity,
        stockStatus,
        category: product.category,
        suppliers: product.suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          whatsapp: supplier.whatsapp,
          supplierPrice: supplier.ProductSupplier?.supplierPrice,
          isAvailable: supplier.ProductSupplier?.isAvailable,
        })),
      };
    });

    // Сортируем по критичности (urgency)
    productsWithDetails.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aOrder = urgencyOrder[a.stockStatus.urgency] || 3;
      const bOrder = urgencyOrder[b.stockStatus.urgency] || 3;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Если urgency одинаковый, сортируем по дефициту
      return b.deficit - a.deficit;
    });

    // Группировка по поставщикам или категориям
    let grouped = {};

    if (groupBy === 'supplier') {
      // Группировка по поставщикам
      productsWithDetails.forEach(product => {
        if (product.suppliers.length === 0) {
          // Товары без поставщиков
          if (!grouped['Без поставщика']) {
            grouped['Без поставщика'] = {
              supplier: null,
              products: [],
              totalItems: 0,
              totalCost: 0,
            };
          }
          grouped['Без поставщика'].products.push(product);
          grouped['Без поставщика'].totalItems++;
        } else {
          // Добавляем товар к каждому его поставщику
          product.suppliers.forEach(supplier => {
            if (!grouped[supplier.name]) {
              grouped[supplier.name] = {
                supplier: {
                  id: supplier.id,
                  name: supplier.name,
                  phone: supplier.phone,
                  whatsapp: supplier.whatsapp,
                },
                products: [],
                totalItems: 0,
                totalCost: 0,
              };
            }

            const productForSupplier = { ...product, selectedSupplier: supplier };
            grouped[supplier.name].products.push(productForSupplier);
            grouped[supplier.name].totalItems++;
            
            const cost = (supplier.supplierPrice || 0) * product.recommendedQuantity;
            grouped[supplier.name].totalCost += cost;
          });
        }
      });
    } else if (groupBy === 'category') {
      // Группировка по категориям
      productsWithDetails.forEach(product => {
        const categoryName = product.category?.name || 'Без категории';
        
        if (!grouped[categoryName]) {
          grouped[categoryName] = {
            category: product.category,
            products: [],
            totalItems: 0,
          };
        }
        
        grouped[categoryName].products.push(product);
        grouped[categoryName].totalItems++;
      });
    } else {
      // Без группировки
      grouped['all'] = {
        products: productsWithDetails,
        totalItems: productsWithDetails.length,
      };
    }

    // Конвертируем объект в массив и сортируем по важности
    const groupedArray = Object.entries(grouped).map(([key, value]) => ({
      groupName: key,
      ...value,
    }));

    // Подсчитываем общую статистику
    const totalCritical = productsWithDetails.filter(p => p.stockStatus.urgency === 'critical').length;
    const totalHigh = productsWithDetails.filter(p => p.stockStatus.urgency === 'high').length;
    const totalMedium = productsWithDetails.filter(p => p.stockStatus.urgency === 'medium').length;

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: productsWithDetails.length,
          critical: totalCritical,
          high: totalHigh,
          medium: totalMedium,
          groupBy,
        },
        groups: groupedArray,
      },
    });
  } catch (error) {
    console.error('Ошибка получения рекомендаций для закупки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении рекомендаций',
      error: error.message,
    });
  }
};

module.exports = {
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
  getStockStatus, // Экспортируем для использования в других контроллерах
};
