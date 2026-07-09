const {
  Product,
  ProductMarketplaceListing,
  Supplier,
  ProductSupplier,
  Category,
} = require('../models');
const { Op } = require('sequelize');

const KASPI_MARKETPLACE = 'kaspi';

const kaspiListingInclude = {
  model: ProductMarketplaceListing,
  as: 'marketplaceListings',
  required: false,
  where: { marketplace: KASPI_MARKETPLACE },
  attributes: ['id', 'marketplace', 'sku', 'marketplaceName', 'price', 'status'],
};

const getKaspiListing = (product) => {
  const listings = product.marketplaceListings || [];
  return listings.find((listing) => listing.marketplace === KASPI_MARKETPLACE) || listings[0] || null;
};

const getKaspiExportFields = (product) => {
  const listing = getKaspiListing(product);
  return {
    sku: listing?.sku || product.kaspiArticle,
    name: listing?.marketplaceName || product.kaspiName,
    price: listing?.price ?? product.sellingPrice,
  };
};

const hasKaspiExportData = (product) => {
  const fields = getKaspiExportFields(product);
  return Boolean(String(fields.sku || '').trim() && String(fields.name || '').trim());
};

/**
 * Экспорт товаров для Kaspi/ProfitBot в формате JSON
 * GET /api/export/kaspi/json
 */
const exportKaspiJSON = async (req, res) => {
  try {
    const { onlyInStock = 'false', categoryId } = req.query;

    const whereClause = { isActive: true };

    // Фильтр: только товары в наличии
    if (onlyInStock === 'true') {
      whereClause.currentStock = {
        [Op.gt]: 0,
      };
    }

    // Фильтр по категории
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id',
        'kaspiArticle', // Артикул Kaspi (обязательное поле)
        'kaspiName', // Название Kaspi (обязательное поле)
        'sellingPrice', // Цена продажи
        'currentStock', // Остаток
        'image', // Изображение
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
        kaspiListingInclude,
      ],
      order: [['kaspiName', 'ASC']],
    });

    products.forEach((product) => {
      const kaspi = getKaspiExportFields(product);
      product.setDataValue('kaspiArticle', kaspi.sku);
      product.setDataValue('kaspiName', kaspi.name);
      product.setDataValue('sellingPrice', kaspi.price);
    });

    // Форматируем данные для Kaspi/ProfitBot
    const exportData = products
      .filter(p => p.kaspiArticle && p.kaspiName) // Только товары с Kaspi данными
      .map(product => ({
        sku: product.kaspiArticle, // Артикул
        name: product.kaspiName, // Название
        price: parseFloat(product.sellingPrice), // Цена
        quantity: product.currentStock, // Остаток
        available: product.currentStock > 0, // Доступность
        image_url: product.image ? `${process.env.API_URL || 'http://localhost:5000'}${product.image}` : null,
        category: product.category?.name || '',
      }));

    res.json({
      success: true,
      data: {
        products: exportData,
        total: exportData.length,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Ошибка экспорта в JSON:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка экспорта в JSON',
      error: error.message,
    });
  }
};

/**
 * Экспорт товаров для Kaspi в формате CSV
 * GET /api/export/kaspi/csv
 */
const exportKaspiCSV = async (req, res) => {
  try {
    const { onlyInStock = 'false', categoryId } = req.query;

    const whereClause = { isActive: true };

    if (onlyInStock === 'true') {
      whereClause.currentStock = {
        [Op.gt]: 0,
      };
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id',
        'kaspiArticle',
        'kaspiName',
        'sellingPrice',
        'currentStock',
        'image',
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name'],
        },
        kaspiListingInclude,
      ],
      order: [['kaspiName', 'ASC']],
    });

    // Генерируем CSV
    products.forEach((product) => {
      const kaspi = getKaspiExportFields(product);
      product.setDataValue('kaspiArticle', kaspi.sku);
      product.setDataValue('kaspiName', kaspi.name);
      product.setDataValue('sellingPrice', kaspi.price);
    });

    let csv = 'SKU,Name,Price,Quantity,Available,Image URL,Category\n';

    products
      .filter(p => p.kaspiArticle && p.kaspiName)
      .forEach(product => {
        const imageUrl = product.image
          ? `${process.env.API_URL || 'http://localhost:5000'}${product.image}`
          : '';

        csv += `"${product.kaspiArticle}","${product.kaspiName}",${product.sellingPrice},${product.currentStock},${product.currentStock > 0 ? 'Yes' : 'No'},"${imageUrl}","${product.category?.name || ''}"\n`;
      });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=kaspi_export_${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // BOM для корректной кодировки в Excel
  } catch (error) {
    console.error('Ошибка экспорта в CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка экспорта в CSV',
      error: error.message,
    });
  }
};

/**
 * Получить информацию о готовности данных для экспорта
 * GET /api/export/kaspi/status
 */
const getExportStatus = async (req, res) => {
  try {
    // Общее количество товаров
    const totalProducts = await Product.count({
      where: { isActive: true },
    });

    // Товары с заполненными Kaspi полями
    const productsWithKaspi = await Product.count({
      where: {
        isActive: true,
        kaspiArticle: { [Op.ne]: null },
        kaspiName: { [Op.ne]: null },
      },
    });

    // Товары в наличии с Kaspi данными
    const productsInStock = await Product.count({
      where: {
        isActive: true,
        kaspiArticle: { [Op.ne]: null },
        kaspiName: { [Op.ne]: null },
        currentStock: { [Op.gt]: 0 },
      },
    });

    // Товары БЕЗ Kaspi данных (требуют заполнения)
    const productsWithoutKaspi = await Product.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { kaspiArticle: null },
          { kaspiName: null },
        ],
      },
      attributes: ['id', 'name', 'article', 'currentStock'],
      limit: 20, // Первые 20 для примера
    });

    const readyPercentage = totalProducts > 0
      ? ((productsWithKaspi / totalProducts) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        total: totalProducts,
        readyForExport: productsWithKaspi,
        inStock: productsInStock,
        needsAttention: productsWithoutKaspi.length,
        readyPercentage: parseFloat(readyPercentage),
        productsWithoutKaspiData: productsWithoutKaspi,
      },
    });
  } catch (error) {
    console.error('Ошибка получения статуса экспорта:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статуса экспорта',
      error: error.message,
    });
  }
};

/**
 * Экспорт прайс-листа для поставщиков
 * GET /api/export/price-list
 */
const exportPriceList = async (req, res) => {
  try {
    const { supplierId, categoryId, format = 'json' } = req.query;

    const whereClause = { isActive: true };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    let supplierFilter = null;
    if (supplierId) {
      supplierFilter = {
        model: Supplier,
        as: 'suppliers',
        where: { id: supplierId },
        through: {
          model: ProductSupplier,
          attributes: ['supplierPrice', 'isAvailable'],
        },
      };
    } else {
      supplierFilter = {
        model: Supplier,
        as: 'suppliers',
        through: {
          model: ProductSupplier,
          attributes: ['supplierPrice', 'isAvailable'],
        },
        required: false,
      };
    }

    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id',
        'name',
        'internalName',
        'article',
        'costPrice',
        'sellingPrice',
        'currentStock',
      ],
      include: [
        supplierFilter,
        {
          model: Category,
          as: 'category',
          attributes: ['name'],
        },
      ],
      order: [['name', 'ASC']],
    });

    if (format === 'csv') {
      // CSV формат
      let csv = 'Article,Name,Cost Price,Selling Price,Stock,Supplier,Supplier Price,Category\n';

      products.forEach(product => {
        const baseLine = `"${product.article}","${product.internalName || product.name}",${product.costPrice},${product.sellingPrice},${product.currentStock}`;
        const category = product.category?.name || '';

        if (product.suppliers && product.suppliers.length > 0) {
          product.suppliers.forEach(supplier => {
            csv += `${baseLine},"${supplier.name}",${supplier.ProductSupplier.supplierPrice},"${category}"\n`;
          });
        } else {
          csv += `${baseLine},"","","${category}"\n`;
        }
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=price_list_${Date.now()}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      // JSON формат
      const exportData = products.map(p => ({
        article: p.article,
        name: p.internalName || p.name,
        costPrice: parseFloat(p.costPrice),
        sellingPrice: parseFloat(p.sellingPrice),
        currentStock: p.currentStock,
        category: p.category?.name || '',
        suppliers: p.suppliers?.map(s => ({
          name: s.name,
          price: parseFloat(s.ProductSupplier.supplierPrice),
          available: s.ProductSupplier.isAvailable,
        })) || [],
      }));

      res.json({
        success: true,
        data: {
          products: exportData,
          total: exportData.length,
          generated_at: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Ошибка экспорта прайс-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка экспорта прайс-листа',
      error: error.message,
    });
  }
};

module.exports = {
  exportKaspiJSON,
  exportKaspiCSV,
  getExportStatus,
  exportPriceList,
};
