const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Product, Supplier, ProductSupplier, ProductVariation, PriceHistory, Category, sequelize } = require('../models');
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
      ],
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
  getPurchaseSuggestions,
  getStockStatus, // Экспортируем для использования в других контроллерах
};
