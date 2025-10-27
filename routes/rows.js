const express = require('express');
const router = express.Router();
const { Sector, Row, Supplier } = require('../models/associations');
const { Op } = require('sequelize');

// GET /api/rows - Получить все ряды (с возможностью фильтрации по сектору)
router.get('/', async (req, res) => {
  try {
    const { sectorId } = req.query;
    
    const whereClause = { isActive: true };
    if (sectorId) {
      whereClause.sectorId = sectorId;
    }

    const rows = await Row.findAll({
      include: [
        {
          model: Sector,
          as: 'sector',
          attributes: ['id', 'name', 'code', 'productType', 'color', 'icon'],
        },
        {
          model: Supplier,
          as: 'suppliers',
          where: { isActive: true },
          required: false,
        }
      ],
      where: whereClause,
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Ошибка при получении рядов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении рядов',
      error: error.message,
    });
  }
});

// GET /api/rows/:id - Получить ряд по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const row = await Row.findByPk(id, {
      include: [
        {
          model: Sector,
          as: 'sector',
        },
        {
          model: Supplier,
          as: 'suppliers',
          where: { isActive: true },
          required: false,
        }
      ],
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Ряд не найден',
      });
    }

    res.json({
      success: true,
      data: row,
    });
  } catch (error) {
    console.error('Ошибка при получении ряда:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении ряда',
      error: error.message,
    });
  }
});

// POST /api/rows - Создать новый ряд
router.post('/', async (req, res) => {
  try {
    const { sectorId, name, code, totalSpaces, position } = req.body;

    // Валидация обязательных полей
    if (!sectorId || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Сектор, название и код обязательны',
        errors: [
          { field: 'sectorId', message: 'Сектор обязателен' },
          { field: 'name', message: 'Название обязательно' },
          { field: 'code', message: 'Код обязателен' }
        ]
      });
    }

    // Проверка существования сектора
    const sector = await Sector.findByPk(sectorId);
    if (!sector) {
      return res.status(400).json({
        success: false,
        message: 'Указанный сектор не найден',
        errors: [{ field: 'sectorId', message: 'Сектор не существует' }]
      });
    }

    // Проверка уникальности кода в рамках сектора
    const existingRow = await Row.findOne({ 
      where: { 
        sectorId,
        code 
      } 
    });
    if (existingRow) {
      return res.status(400).json({
        success: false,
        message: 'Ряд с таким кодом уже существует в данном секторе',
        errors: [{ field: 'code', message: 'Код должен быть уникальным в рамках сектора' }]
      });
    }

    const row = await Row.create({
      sectorId,
      name,
      code,
      totalSpaces: totalSpaces || 0,
      occupiedSpaces: 0,
      position,
    });

    // Обновляем количество рядов в секторе
    const rowsCount = await Row.count({ where: { sectorId, isActive: true } });
    await sector.update({ rowsCount });

    // Получаем созданный ряд с информацией о секторе
    const createdRow = await Row.findByPk(row.id, {
      include: [
        {
          model: Sector,
          as: 'sector',
          attributes: ['id', 'name', 'code', 'productType', 'color', 'icon'],
        }
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Ряд успешно создан',
      data: createdRow,
    });
  } catch (error) {
    console.error('Ошибка при создании ряда:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании ряда',
      error: error.message,
    });
  }
});

// PUT /api/rows/:id - Обновить ряд
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, totalSpaces, occupiedSpaces, position, isActive } = req.body;

    const row = await Row.findByPk(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Ряд не найден',
      });
    }

    // Проверка уникальности кода в рамках сектора (исключая текущий ряд)
    if (code && code !== row.code) {
      const existingRow = await Row.findOne({ 
        where: { 
          sectorId: row.sectorId,
          code,
          id: { [Op.ne]: id }
        } 
      });
      if (existingRow) {
        return res.status(400).json({
          success: false,
          message: 'Ряд с таким кодом уже существует в данном секторе',
          errors: [{ field: 'code', message: 'Код должен быть уникальным в рамках сектора' }]
        });
      }
    }

    await row.update({
      name: name || row.name,
      code: code || row.code,
      totalSpaces: totalSpaces !== undefined ? totalSpaces : row.totalSpaces,
      occupiedSpaces: occupiedSpaces !== undefined ? occupiedSpaces : row.occupiedSpaces,
      position: position !== undefined ? position : row.position,
      isActive: isActive !== undefined ? isActive : row.isActive,
    });

    // Обновляем количество рядов в секторе, если изменился статус активности
    if (isActive !== undefined && isActive !== row.isActive) {
      const rowsCount = await Row.count({ where: { sectorId: row.sectorId, isActive: true } });
      const sector = await Sector.findByPk(row.sectorId);
      if (sector) {
        await sector.update({ rowsCount });
      }
    }

    res.json({
      success: true,
      message: 'Ряд успешно обновлен',
      data: row,
    });
  } catch (error) {
    console.error('Ошибка при обновлении ряда:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении ряда',
      error: error.message,
    });
  }
});

// DELETE /api/rows/:id - Удалить ряд
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const row = await Row.findByPk(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Ряд не найден',
      });
    }

    // Проверим, есть ли связанные поставщики
    const suppliersCount = await Supplier.count({ where: { rowId: id } });
    if (suppliersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Нельзя удалить ряд, к которому привязано ${suppliersCount} поставщиков. Сначала переместите или удалите поставщиков.`,
      });
    }

    const sectorId = row.sectorId;
    await row.destroy();

    // Обновляем количество рядов в секторе
    const rowsCount = await Row.count({ where: { sectorId, isActive: true } });
    const sector = await Sector.findByPk(sectorId);
    if (sector) {
      await sector.update({ rowsCount });
    }

    res.json({
      success: true,
      message: 'Ряд успешно удален',
    });
  } catch (error) {
    console.error('Ошибка при удалении ряда:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении ряда',
      error: error.message,
    });
  }
});

// PUT /api/rows/:id/update-occupancy - Обновить заполненность ряда
router.put('/:id/update-occupancy', async (req, res) => {
  try {
    const { id } = req.params;

    const row = await Row.findByPk(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Ряд не найден',
      });
    }

    // Подсчитываем количество активных поставщиков в ряду
    const occupiedSpaces = await Supplier.count({ 
      where: { 
        rowId: id,
        isActive: true 
      } 
    });

    await row.update({ occupiedSpaces });

    res.json({
      success: true,
      message: 'Заполненность ряда обновлена',
      data: { occupiedSpaces, totalSpaces: row.totalSpaces },
    });
  } catch (error) {
    console.error('Ошибка при обновлении заполненности ряда:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении заполненности ряда',
      error: error.message,
    });
  }
});

module.exports = router;
