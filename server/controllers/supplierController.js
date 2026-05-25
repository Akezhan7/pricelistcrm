const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Supplier, Product, ProductSupplier, Market, Sector, Row, Order, Payment, User } = require('../models');
const path = require('path');
const fs = require('fs').promises;

const getAllSuppliers = async (req, res) => {
  try {
    const { search, sector, sortBy = 'name', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      isActive: true,
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    if (sector) {
      whereClause.sector = sector;
    }

    let order = [['name', 'ASC']];
    if (sortBy === 'sector') {
      order = [['sector', 'ASC'], ['name', 'ASC']];
    }

    const suppliers = await Supplier.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'address', 'phone', 'whatsapp', 'containerImage', 
                   'sector', 'mapPosition', 'notes', 'debt', 'isActive', 
                   'marketId', 'sectorId', 'rowId', 'row', 'container', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Product,
          as: 'products',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        {
          model: Market,
          as: 'market',
          attributes: ['id', 'name', 'address'],
          required: false,
        },
        {
          model: Sector,
          as: 'sectorInfo',
          attributes: ['id', 'name', 'code', 'productType', 'color', 'icon'],
          required: false,
        },
        {
          model: Row,
          as: 'rowInfo',
          attributes: ['id', 'name', 'code', 'totalSpaces', 'occupiedSpaces'],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order,
    });

    // Сортировка по минимальной цене, если запрошена
    if (sortBy === 'minPrice') {
      suppliers.rows.sort((a, b) => {
        const minPriceA = Math.min(...a.products.map(p => parseFloat(p.ProductSupplier.supplierPrice) || 0));
        const minPriceB = Math.min(...b.products.map(p => parseFloat(p.ProductSupplier.supplierPrice) || 0));
        return minPriceA - minPriceB;
      });
    }

    res.json({
      success: true,
      data: {
        suppliers: suppliers.rows,
        pagination: {
          total: suppliers.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(suppliers.count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения поставщиков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении поставщиков',
    });
  }
};

const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findOne({
      where: { id, isActive: true },
      attributes: ['id', 'name', 'address', 'phone', 'whatsapp', 'containerImage', 
                   'sector', 'mapPosition', 'notes', 'debt', 'isActive', 
                   'marketId', 'sectorId', 'rowId', 'row', 'container', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Product,
          as: 'products',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
          where: { isActive: true },
          required: false,
        },
        {
          model: Market,
          as: 'market',
          attributes: ['id', 'name', 'address'],
          required: false,
        },
        {
          model: Sector,
          as: 'sectorInfo',
          attributes: ['id', 'name', 'code', 'productType', 'color', 'icon'],
          required: false,
        },
        {
          model: Row,
          as: 'rowInfo',
          attributes: ['id', 'name', 'code', 'totalSpaces', 'occupiedSpaces'],
          required: false,
        },
      ],
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден',
      });
    }

    res.json({
      success: true,
      data: { supplier },
    });
  } catch (error) {
    console.error('Ошибка получения поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении поставщика',
    });
  }
};

const createSupplier = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { 
      name, 
      address, 
      phone, 
      whatsapp,
      marketId,
      sector, 
      mapPosition, 
      notes,
      debt,
      row,
      container
    } = req.body;
    // products may be sent as JSON string in multipart/form-data. Accept both array and JSON string.
    let products = req.body.products;
    if (products && typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        products = null;
      }
    }

    const supplier = await Supplier.create({
      name,
      address,
      phone,
      marketId: marketId || null,
      whatsapp,
      sector,
      mapPosition: mapPosition ? JSON.parse(mapPosition) : null,
      notes,
      // Если debt передан (в FormData приходит строкой), приводим к числу
      debt: debt !== undefined && debt !== '' ? parseFloat(debt) : undefined,
      containerImage: req.file ? `/uploads/${req.file.filename}` : null,
      row: row || null,
      container: container || null,
    });

    // Добавление товаров, если они указаны
    if (products && Array.isArray(products)) {
      const productData = products.map(p => ({
        productId: p.id,
        supplierId: supplier.id,
        supplierPrice: p.price,
        quantity: p.quantity || 0,
        isAvailable: p.isAvailable !== false,
        notes: p.notes || '',
      }));

      await ProductSupplier.bulkCreate(productData);
    }

    // Получение созданного поставщика с товарами
    const createdSupplier = await Supplier.findOne({
      where: { id: supplier.id },
      include: [
        {
          model: Product,
          as: 'products',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Поставщик успешно создан',
      data: { supplier: createdSupplier },
    });
  } catch (error) {
    console.error('Ошибка создания поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании поставщика',
    });
  }
};

const updateSupplier = async (req, res) => {
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
      address, 
      phone, 
      whatsapp,
      marketId,
      sector, 
      mapPosition, 
      notes,
      debt,
      row,
      container
    } = req.body;
    // products may be sent as JSON string in multipart/form-data. Accept both array and JSON string.
    let products = req.body.products;
    if (products && typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        products = null;
      }
    }

    const supplier = await Supplier.findOne({ where: { id, isActive: true } });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден',
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (phone) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (marketId !== undefined) updateData.marketId = marketId || null;
    if (sector !== undefined) updateData.sector = sector;
    if (mapPosition) updateData.mapPosition = JSON.parse(mapPosition);
    if (notes !== undefined) updateData.notes = notes;
    if (row !== undefined) updateData.row = row || null;
    if (container !== undefined) updateData.container = container || null;
    // Обработка задолженности (debt)
    if (debt !== undefined && debt !== '') {
      const parsedDebt = parseFloat(debt);
      if (!Number.isNaN(parsedDebt)) {
        updateData.debt = parsedDebt;
      }
    }

    // Обработка загрузки нового изображения контейнера
    if (req.file) {
      // Удаление старого изображения
      if (supplier.containerImage) {
        try {
          const oldImagePath = path.resolve(process.cwd(), '.' + supplier.containerImage);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.log('Не удалось удалить старое изображение:', error.message);
        }
      }
      updateData.containerImage = `/uploads/${req.file.filename}`;
    }

    await supplier.update(updateData);

    // Обновление товаров
    if (products && Array.isArray(products)) {
      // Удаление существующих связей
      await ProductSupplier.destroy({ where: { supplierId: id } });

      // Создание новых связей
      const productData = products.map(p => ({
        productId: p.id,
        supplierId: id,
        supplierPrice: p.price,
        quantity: p.quantity || 0,
        isAvailable: p.isAvailable !== false,
        notes: p.notes || '',
      }));

      await ProductSupplier.bulkCreate(productData);
    }

    // Получение обновленного поставщика
    const updatedSupplier = await Supplier.findOne({
      where: { id },
      include: [
        {
          model: Product,
          as: 'products',
          through: {
            model: ProductSupplier,
            attributes: ['supplierPrice', 'quantity', 'isAvailable', 'notes'],
          },
        },
      ],
    });

    res.json({
      success: true,
      message: 'Поставщик успешно обновлен',
      data: { supplier: updatedSupplier },
    });
  } catch (error) {
    console.error('Ошибка обновления поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении поставщика',
    });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findOne({ where: { id, isActive: true } });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден',
      });
    }

    // Мягкое удаление
    await supplier.update({ isActive: false });

    res.json({
      success: true,
      message: 'Поставщик успешно удален',
    });
  } catch (error) {
    console.error('Ошибка удаления поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении поставщика',
    });
  }
};

// Полное удаление поставщика из базы данных
const deleteSupplierPermanently = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден',
      });
    }

    // Удаление связей с товарами
    await ProductSupplier.destroy({ where: { supplierId: id } });

    // Удаление файла изображения, если он есть
    if (supplier.containerImage) {
      try {
        const imagePath = path.resolve(process.cwd(), '.' + supplier.containerImage);
        await fs.unlink(imagePath);
      } catch (error) {
        console.log('Не удалось удалить изображение поставщика:', error.message);
      }
    }

    // Полное удаление поставщика
    await supplier.destroy();

    res.json({
      success: true,
      message: 'Поставщик полностью удалён из базы данных',
    });
  } catch (error) {
    console.error('Ошибка полного удаления поставщика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при полном удалении поставщика',
    });
  }
};

// Получение уникальных секторов
const getSectors = async (req, res) => {
  try {
    const sectors = await Supplier.findAll({
      attributes: ['sector'],
      where: {
        isActive: true,
        sector: { [Op.ne]: null },
      },
      group: ['sector'],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        sectors: sectors.map(s => s.sector).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Ошибка получения секторов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении секторов',
    });
  }
};

/**
 * Сверка с поставщиком за период.
 * GET /api/suppliers/:id/reconciliation?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Возвращает:
 *   - данные поставщика
 *   - период
 *   - opening_balance: сумма (totalAmount - paidAmount) активных заявок poставщика,
 *     созданных до начала периода, минус сумма всех платежей до начала периода,
 *     минус (totalAmount возвратов до начала периода).
 *   - movements: список «строк» отчёта (orders type=purchase, orders type=return, payments),
 *     отсортированный по дате asc.
 *   - totals: сумма приходов (purchase), возвратов, оплат за период.
 *   - closing_balance: opening + приход - возврат - оплата.
 */
const getReconciliation = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const supplier = await Supplier.findOne({
      where: { id, isActive: true },
      attributes: ['id', 'name', 'phone', 'whatsapp', 'address', 'debt'],
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден',
      });
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    // Включаем конец дня для toDate
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    const periodWhere = {};
    if (fromDate || toDate) {
      periodWhere[Op.and] = [];
      if (fromDate) periodWhere[Op.and].push({ createdAt: { [Op.gte]: fromDate } });
      if (toDate) periodWhere[Op.and].push({ createdAt: { [Op.lte]: toDate } });
    }

    // 1) Заявки на поставку и возвраты за период
    const orders = await Order.findAll({
      where: {
        supplierId: id,
        isActive: true,
        ...periodWhere,
      },
      attributes: ['id', 'orderNumber', 'type', 'totalAmount', 'paidAmount', 'status', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    // 2) Платежи за период
    const paymentsWhere = { supplierId: id };
    if (fromDate || toDate) {
      paymentsWhere[Op.and] = [];
      if (fromDate) paymentsWhere[Op.and].push({ paymentDate: { [Op.gte]: fromDate } });
      if (toDate) paymentsWhere[Op.and].push({ paymentDate: { [Op.lte]: toDate } });
    }
    const payments = await Payment.findAll({
      where: paymentsWhere,
      attributes: ['id', 'amount', 'paymentMethod', 'comment', 'paymentDate', 'receiptUrl'],
      order: [['paymentDate', 'ASC']],
    });

    // 3) Расчёт открывающего сальдо: всё, что было до from
    let openingBalance = 0;
    if (fromDate) {
      const beforeOrders = await Order.findAll({
        where: {
          supplierId: id,
          isActive: true,
          createdAt: { [Op.lt]: fromDate },
        },
        attributes: ['totalAmount', 'type'],
      });

      const beforePayments = await Payment.findAll({
        where: {
          supplierId: id,
          paymentDate: { [Op.lt]: fromDate },
        },
        attributes: ['amount'],
      });

      const ordersPurchaseSum = beforeOrders
        .filter((o) => o.type !== 'return')
        .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
      const ordersReturnSum = beforeOrders
        .filter((o) => o.type === 'return')
        .reduce((s, o) => s + parseFloat(o.totalAmount), 0);
      const paymentsSum = beforePayments.reduce((s, p) => s + parseFloat(p.amount), 0);

      // Долг перед поставщиком на начало периода
      openingBalance = ordersPurchaseSum - ordersReturnSum - paymentsSum;
    }

    // 4) Формируем единый список движений
    const movements = [
      ...orders.map((o) => ({
        date: o.createdAt,
        kind: o.type === 'return' ? 'return' : 'purchase',
        documentNumber: o.orderNumber,
        purchase: o.type === 'return' ? 0 : parseFloat(o.totalAmount),
        returned: o.type === 'return' ? parseFloat(o.totalAmount) : 0,
        payment: 0,
        comment: o.status,
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        kind: 'payment',
        documentNumber: `PAY-${p.id}`,
        purchase: 0,
        returned: 0,
        payment: parseFloat(p.amount),
        comment: [p.paymentMethod, p.comment].filter(Boolean).join(' · '),
        receiptUrl: p.receiptUrl || null,
      })),
    ];

    movements.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 5) Подсчёт running balance и итогов
    let running = openingBalance;
    const enriched = movements.map((m) => {
      running = running + m.purchase - m.returned - m.payment;
      return { ...m, balance: Number(running.toFixed(2)) };
    });

    const totals = movements.reduce(
      (acc, m) => ({
        purchase: acc.purchase + m.purchase,
        returned: acc.returned + m.returned,
        payment: acc.payment + m.payment,
      }),
      { purchase: 0, returned: 0, payment: 0 }
    );

    const closingBalance = openingBalance + totals.purchase - totals.returned - totals.payment;

    res.json({
      success: true,
      data: {
        supplier,
        period: {
          from: from || null,
          to: to || null,
        },
        openingBalance: Number(openingBalance.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
        totals: {
          purchase: Number(totals.purchase.toFixed(2)),
          returned: Number(totals.returned.toFixed(2)),
          payment: Number(totals.payment.toFixed(2)),
        },
        movements: enriched,
      },
    });
  } catch (error) {
    console.error('Ошибка формирования сверки:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка формирования сверки',
      error: error.message,
    });
  }
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  deleteSupplierPermanently,
  getSectors,
  getReconciliation,
};
