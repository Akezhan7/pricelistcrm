const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Product, Supplier, ProductSupplier, ProductVariation, PriceHistory } = require('../models');
const path = require('path');
const fs = require('fs').promises;
const { createPriceHistoryRecord } = require('./priceHistoryController');

const getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      isActive: true,
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { article: { [Op.like]: `%${search}%` } },
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
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']],
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

    const { name, article, costPrice, sellingPrice, description } = req.body;
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

    const product = await Product.create({
      name,
      article,
      costPrice,
      sellingPrice,
      description,
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
    const { name, article, costPrice, sellingPrice, description } = req.body;
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
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (sellingPrice !== undefined) updateData.sellingPrice = sellingPrice;
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

module.exports = {
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
};
