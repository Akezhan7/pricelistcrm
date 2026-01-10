const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Category, Product } = require('../models');

/**
 * Получить все категории с возможностью поиска и фильтрации
 * GET /api/categories
 */
const getAllCategories = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    // Фильтр по активности
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Поиск по названию
    if (search) {
      whereClause.name = { [Op.like]: `%${search}%` };
    }

    const categories = await Category.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: Category,
          as: 'subcategories',
          attributes: ['id', 'name', 'isActive'],
          required: false,
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id'],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']],
    });

    // Добавляем количество товаров в каждой категории
    const categoriesWithCount = categories.rows.map(category => {
      const categoryData = category.toJSON();
      categoryData.productsCount = categoryData.products?.length || 0;
      delete categoryData.products; // Удаляем массив products, оставляем только счётчик
      return categoryData;
    });

    res.json({
      success: true,
      data: {
        categories: categoriesWithCount,
        pagination: {
          total: categories.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(categories.count / limit),
        },
      },
    });
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении категорий',
      error: error.message,
    });
  }
};

/**
 * Получить одну категорию по ID
 * GET /api/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'description'],
          required: false,
        },
        {
          model: Category,
          as: 'subcategories',
          attributes: ['id', 'name', 'description', 'isActive'],
          required: false,
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'name', 'article', 'currentStock', 'minStock'],
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Категория не найдена',
      });
    }

    const categoryData = category.toJSON();
    categoryData.productsCount = categoryData.products?.length || 0;

    res.json({
      success: true,
      data: { category: categoryData },
    });
  } catch (error) {
    console.error('Ошибка получения категории:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении категории',
      error: error.message,
    });
  }
};

/**
 * Получить иерархическое дерево категорий
 * GET /api/categories/tree
 */
const getCategoriesTree = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    const whereClause = includeInactive === 'true' ? {} : { isActive: true };

    // Получаем все категории верхнего уровня (без родителя)
    const rootCategories = await Category.findAll({
      where: {
        ...whereClause,
        parentId: null,
      },
      include: [
        {
          model: Product,
          as: 'products',
          attributes: ['id'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    // Рекурсивная функция для построения дерева
    const buildTree = async (parentId, level = 0) => {
      const children = await Category.findAll({
        where: {
          ...whereClause,
          parentId,
        },
        include: [
          {
            model: Product,
            as: 'products',
            attributes: ['id'],
            required: false,
          },
        ],
        order: [['name', 'ASC']],
      });

      return Promise.all(
        children.map(async (child) => {
          const childData = child.toJSON();
          childData.productsCount = childData.products?.length || 0;
          childData.level = level;
          delete childData.products;

          // Рекурсивно получаем подкатегории
          childData.children = await buildTree(child.id, level + 1);
          
          return childData;
        })
      );
    };

    // Строим дерево для каждой корневой категории
    const tree = await Promise.all(
      rootCategories.map(async (root) => {
        const rootData = root.toJSON();
        rootData.productsCount = rootData.products?.length || 0;
        rootData.level = 0;
        delete rootData.products;

        rootData.children = await buildTree(root.id, 1);
        
        return rootData;
      })
    );

    res.json({
      success: true,
      data: { tree },
    });
  } catch (error) {
    console.error('Ошибка получения дерева категорий:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении дерева категорий',
      error: error.message,
    });
  }
};

/**
 * Создать новую категорию
 * POST /api/categories
 */
const createCategory = async (req, res) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array(),
      });
    }

    const { name, description, parentId, isActive = true } = req.body;

    // Проверяем, существует ли родительская категория
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Родительская категория не найдена',
        });
      }
    }

    // Проверяем уникальность названия в рамках одного родителя
    const existingCategory = await Category.findOne({
      where: {
        name,
        parentId: parentId || null,
      },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Категория с таким названием уже существует на этом уровне',
      });
    }

    const category = await Category.create({
      name,
      description,
      parentId: parentId || null,
      isActive,
    });

    // Получаем созданную категорию с связями
    const createdCategory = await Category.findByPk(category.id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Категория успешно создана',
      data: { category: createdCategory },
    });
  } catch (error) {
    console.error('Ошибка создания категории:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании категории',
      error: error.message,
    });
  }
};

/**
 * Обновить категорию
 * PUT /api/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, description, parentId, isActive } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Категория не найдена',
      });
    }

    // Проверяем, не пытается ли пользователь сделать категорию родителем самой себе
    if (parentId && parseInt(parentId) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Категория не может быть родителем самой себе',
      });
    }

    // Проверяем, не создаёт ли это циклическую зависимость
    if (parentId) {
      const parentCategory = await Category.findByPk(parentId);
      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: 'Родительская категория не найдена',
        });
      }

      // Проверяем, не является ли новый родитель потомком текущей категории
      let currentParent = parentCategory;
      while (currentParent.parentId) {
        if (parseInt(currentParent.parentId) === parseInt(id)) {
          return res.status(400).json({
            success: false,
            message: 'Нельзя создать циклическую зависимость категорий',
          });
        }
        currentParent = await Category.findByPk(currentParent.parentId);
        if (!currentParent) break;
      }
    }

    // Проверяем уникальность названия
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: {
          name,
          parentId: parentId !== undefined ? (parentId || null) : category.parentId,
          id: { [Op.ne]: id },
        },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Категория с таким названием уже существует на этом уровне',
        });
      }
    }

    // Обновляем категорию
    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      parentId: parentId !== undefined ? (parentId || null) : category.parentId,
      isActive: isActive !== undefined ? isActive : category.isActive,
    });

    // Получаем обновлённую категорию с связями
    const updatedCategory = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: Category,
          as: 'subcategories',
          attributes: ['id', 'name', 'isActive'],
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      message: 'Категория успешно обновлена',
      data: { category: updatedCategory },
    });
  } catch (error) {
    console.error('Ошибка обновления категории:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении категории',
      error: error.message,
    });
  }
};

/**
 * Удалить категорию (мягкое удаление)
 * DELETE /api/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'subcategories',
          required: false,
        },
        {
          model: Product,
          as: 'products',
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Категория не найдена',
      });
    }

    // Проверяем, есть ли активные подкатегории
    const activeSubcategories = category.subcategories?.filter(sub => sub.isActive) || [];
    if (activeSubcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить категорию. У неё есть ${activeSubcategories.length} активных подкатегорий. Сначала удалите или переместите их.`,
      });
    }

    // Проверяем, есть ли товары в категории
    if (category.products && category.products.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Невозможно удалить категорию. В ней находится ${category.products.length} товаров. Сначала переместите или удалите их.`,
      });
    }

    if (permanent === 'true') {
      // Полное удаление из БД
      await category.destroy();
      res.json({
        success: true,
        message: 'Категория успешно удалена',
      });
    } else {
      // Мягкое удаление (деактивация)
      await category.update({ isActive: false });
      res.json({
        success: true,
        message: 'Категория успешно деактивирована',
        data: { category },
      });
    }
  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении категории',
      error: error.message,
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoriesTree,
  createCategory,
  updateCategory,
  deleteCategory,
};
