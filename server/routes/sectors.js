const express = require('express');
const router = express.Router();
const { Sector, Row, Supplier } = require('../models/associations');
const { Op } = require('sequelize');

// GET /api/sectors - Получить все сектора
router.get('/', async (req, res) => {
  try {
    const sectors = await Sector.findAll({
      include: [
        {
          model: Row,
          as: 'rows',
          where: { isActive: true },
          required: false,
        },
        {
          model: Supplier,
          as: 'suppliers',
          where: { isActive: true },
          required: false,
        }
      ],
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    res.json({
      success: true,
      data: sectors,
    });
  } catch (error) {
    console.error('Ошибка при получении секторов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении секторов',
      error: error.message,
    });
  }
});

// GET /api/sectors/:id - Получить сектор по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sector = await Sector.findByPk(id, {
      include: [
        {
          model: Row,
          as: 'rows',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: Supplier,
              as: 'suppliers',
              where: { isActive: true },
              required: false,
            }
          ]
        }
      ],
    });

    if (!sector) {
      return res.status(404).json({
        success: false,
        message: 'Сектор не найден',
      });
    }

    res.json({
      success: true,
      data: sector,
    });
  } catch (error) {
    console.error('Ошибка при получении сектора:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении сектора',
      error: error.message,
    });
  }
});

// POST /api/sectors - Создать новый сектор
router.post('/', async (req, res) => {
  try {
    const { name, code, productType, color, icon, description, position, sortOrder } = req.body;

    // Валидация обязательных полей
    if (!name || !code || !productType) {
      return res.status(400).json({
        success: false,
        message: 'Название, код и тип продукции обязательны',
        errors: [
          { field: 'name', message: 'Название обязательно' },
          { field: 'code', message: 'Код обязателен' },
          { field: 'productType', message: 'Тип продукции обязателен' }
        ]
      });
    }

    // Проверка уникальности кода
    const existingSector = await Sector.findOne({ where: { code } });
    if (existingSector) {
      return res.status(400).json({
        success: false,
        message: 'Сектор с таким кодом уже существует',
        errors: [{ field: 'code', message: 'Код должен быть уникальным' }]
      });
    }

    const sector = await Sector.create({
      name,
      code,
      productType,
      color: color || '#6b7280',
      icon,
      description,
      position,
      sortOrder: sortOrder || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Сектор успешно создан',
      data: sector,
    });
  } catch (error) {
    console.error('Ошибка при создании сектора:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании сектора',
      error: error.message,
    });
  }
});

// PUT /api/sectors/:id - Обновить сектор
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, productType, color, icon, description, position, sortOrder, isActive } = req.body;

    const sector = await Sector.findByPk(id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        message: 'Сектор не найден',
      });
    }

    // Проверка уникальности кода (исключая текущий сектор)
    if (code && code !== sector.code) {
      const existingSector = await Sector.findOne({ 
        where: { 
          code,
          id: { [Op.ne]: id }
        } 
      });
      if (existingSector) {
        return res.status(400).json({
          success: false,
          message: 'Сектор с таким кодом уже существует',
          errors: [{ field: 'code', message: 'Код должен быть уникальным' }]
        });
      }
    }

    await sector.update({
      name: name || sector.name,
      code: code || sector.code,
      productType: productType || sector.productType,
      color: color || sector.color,
      icon: icon !== undefined ? icon : sector.icon,
      description: description !== undefined ? description : sector.description,
      position: position !== undefined ? position : sector.position,
      sortOrder: sortOrder !== undefined ? sortOrder : sector.sortOrder,
      isActive: isActive !== undefined ? isActive : sector.isActive,
    });

    res.json({
      success: true,
      message: 'Сектор успешно обновлен',
      data: sector,
    });
  } catch (error) {
    console.error('Ошибка при обновлении сектора:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении сектора',
      error: error.message,
    });
  }
});

// DELETE /api/sectors/:id - Удалить сектор
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const sector = await Sector.findByPk(id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        message: 'Сектор не найден',
      });
    }

    // Проверим, есть ли связанные поставщики
    const suppliersCount = await Supplier.count({ where: { sectorId: id } });
    if (suppliersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Нельзя удалить сектор, к которому привязано ${suppliersCount} поставщиков. Сначала переместите или удалите поставщиков.`,
      });
    }

    await sector.destroy();

    res.json({
      success: true,
      message: 'Сектор успешно удален',
    });
  } catch (error) {
    console.error('Ошибка при удалении сектора:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении сектора',
      error: error.message,
    });
  }
});

module.exports = router;
