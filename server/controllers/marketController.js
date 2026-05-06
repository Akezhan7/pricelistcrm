const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Market, Sector, Supplier } = require('../models');

// Получить все рынки
const getAllMarkets = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    const whereClause = {};
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const markets = await Market.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'address', 'description', 'workingHours', 
                   'contactPhone', 'notes', 'isActive', 'sortOrder', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Sector,
          as: 'sectors',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'code', 'productType'],
        },
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    // Подсчет поставщиков по каждому рынку
    const marketsWithCounts = await Promise.all(
      markets.map(async (market) => {
        const supplierCount = await Supplier.count({
          where: { marketId: market.id, isActive: true },
        });
        const sectorCount = await Sector.count({
          where: { marketId: market.id, isActive: true },
        });
        
        return {
          ...market.toJSON(),
          supplierCount,
          sectorCount,
        };
      })
    );

    res.json({
      success: true,
      data: { markets: marketsWithCounts },
    });
  } catch (error) {
    console.error('Ошибка получения рынков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении рынков',
    });
  }
};

// Получить рынок по ID
const getMarketById = async (req, res) => {
  try {
    const { id } = req.params;

    const market = await Market.findOne({
      where: { id },
      include: [
        {
          model: Sector,
          as: 'sectors',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'name', 'code', 'productType', 'color', 'icon', 'rowsCount'],
        },
      ],
    });

    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Рынок не найден',
      });
    }

    // Подсчет поставщиков
    const supplierCount = await Supplier.count({
      where: { marketId: market.id, isActive: true },
    });

    res.json({
      success: true,
      data: { 
        market: {
          ...market.toJSON(),
          supplierCount,
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения рынка:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении рынка',
    });
  }
};

// Создать новый рынок
const createMarket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибки валидации',
        errors: errors.array(),
      });
    }

    const { name, address, description, workingHours, contactPhone, notes, sortOrder } = req.body;

    // Проверка на существование активного рынка с таким названием
    // Частичный индекс markets_name_active_unique гарантирует уникальность только для активных
    const existingMarket = await Market.findOne({ 
      where: { 
        name: {
          [Op.iLike]: name.trim() // Регистронезависимое сравнение
        },
        isActive: true
      } 
    });
    
    if (existingMarket) {
      return res.status(400).json({
        success: false,
        message: 'Активный рынок с таким названием уже существует',
      });
    }

    const market = await Market.create({
      name: name.trim(),
      address,
      description,
      workingHours,
      contactPhone,
      notes,
      sortOrder: sortOrder || 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Рынок успешно создан',
      data: { market },
    });
  } catch (error) {
    console.error('Ошибка создания рынка:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании рынка',
    });
  }
};

// Обновить рынок
const updateMarket = async (req, res) => {
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
    const { name, address, description, workingHours, contactPhone, notes, sortOrder, isActive } = req.body;

    const market = await Market.findByPk(id);
    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Рынок не найден',
      });
    }

    // Проверка на дубликат названия среди активных рынков (кроме текущего)
    if (name && name.trim() !== market.name) {
      const existingMarket = await Market.findOne({ 
        where: { 
          name: {
            [Op.iLike]: name.trim()
          },
          isActive: true,
          id: {
            [Op.ne]: id // Исключаем текущий рынок
          }
        } 
      });
      
      if (existingMarket) {
        return res.status(400).json({
          success: false,
          message: 'Активный рынок с таким названием уже существует',
        });
      }
    }

    await market.update({
      name: name ? name.trim() : market.name,
      address: address !== undefined ? address : market.address,
      description: description !== undefined ? description : market.description,
      workingHours: workingHours !== undefined ? workingHours : market.workingHours,
      contactPhone: contactPhone !== undefined ? contactPhone : market.contactPhone,
      notes: notes !== undefined ? notes : market.notes,
      sortOrder: sortOrder !== undefined ? sortOrder : market.sortOrder,
      isActive: isActive !== undefined ? isActive : market.isActive,
    });

    res.json({
      success: true,
      message: 'Рынок успешно обновлен',
      data: { market },
    });
  } catch (error) {
    console.error('Ошибка обновления рынка:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении рынка',
    });
  }
};

// Удалить рынок (мягкое удаление - деактивация)
const deleteMarket = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query; // Опциональное физическое удаление

    const market = await Market.findByPk(id);
    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Рынок не найден',
      });
    }

    // Проверка на наличие связанных активных поставщиков
    const supplierCount = await Supplier.count({
      where: { marketId: id, isActive: true },
    });

    if (supplierCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить рынок. С ним связано ${supplierCount} активных поставщиков.`,
      });
    }

    if (permanent === 'true') {
      // Физическое удаление (используется редко, только для очистки)
      await market.destroy();
      return res.json({
        success: true,
        message: 'Рынок полностью удален из системы',
      });
    }

    // Мягкое удаление (деактивация) - по умолчанию
    await market.update({ isActive: false });

    res.json({
      success: true,
      message: 'Рынок успешно деактивирован',
    });
  } catch (error) {
    console.error('Ошибка удаления рынка:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении рынка',
    });
  }
};

// Восстановить деактивированный рынок
const restoreMarket = async (req, res) => {
  try {
    const { id } = req.params;

    const market = await Market.findByPk(id);
    if (!market) {
      return res.status(404).json({
        success: false,
        message: 'Рынок не найден',
      });
    }

    if (market.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Рынок уже активен',
      });
    }

    // Проверка на конфликт названий с другими активными рынками
    const conflictMarket = await Market.findOne({
      where: {
        name: {
          [Op.iLike]: market.name
        },
        isActive: true,
        id: {
          [Op.ne]: id
        }
      }
    });

    if (conflictMarket) {
      return res.status(400).json({
        success: false,
        message: `Невозможно восстановить. Активный рынок с названием "${market.name}" уже существует.`,
      });
    }

    await market.update({ isActive: true });

    res.json({
      success: true,
      message: 'Рынок успешно восстановлен',
      data: { market },
    });
  } catch (error) {
    console.error('Ошибка восстановления рынка:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при восстановлении рынка',
    });
  }
};

module.exports = {
  getAllMarkets,
  getMarketById,
  createMarket,
  updateMarket,
  deleteMarket,
  restoreMarket,
};
