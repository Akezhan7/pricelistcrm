import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { CategoryModal } from '../components/CategoryModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { 
  FolderTree, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  FolderOpen,
  Folder,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import categoryApi from '../services/categoryApi';
import type { Category } from '../types';

export const Categories: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryApi.getCategoriesTree();
      setCategories(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsDeleting(true);
    try {
      await categoryApi.deleteCategory(deletingCategory.id);
      await loadCategories();
      setDeletingCategory(null);
    } catch (error) {
      console.error('Ошибка удаления категории:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await categoryApi.updateCategory(category.id, {
        isActive: !category.isActive
      });
      await loadCategories();
    } catch (error) {
      console.error('Ошибка изменения статуса категории:', error);
    }
  };

  const handleModalSuccess = async () => {
    await loadCategories();
  };

  const getFlatCategories = (cats: Category[]): Category[] => {
    if (!cats || !Array.isArray(cats)) return [];
    let result: Category[] = [];
    cats.forEach(cat => {
      result.push(cat);
      if (cat.subcategories && cat.subcategories.length > 0) {
        result = result.concat(getFlatCategories(cat.subcategories));
      }
    });
    return result;
  };

  const flatCategories = getFlatCategories(categories);

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="border-b border-gray-100 last:border-b-0">
        <div 
          className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
            level > 0 ? 'ml-' + (level * 8) : ''
          }`}
          style={{ paddingLeft: `${level * 32 + 12}px` }}
        >
          <div className="flex items-center gap-3 flex-1">
            {/* Кнопка раскрытия/сворачивания */}
            {hasChildren ? (
              <button
                onClick={() => handleToggleExpand(category.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            {/* Иконка папки */}
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-5 w-5 text-blue-500" />
              ) : (
                <Folder className="h-5 w-5 text-gray-500" />
              )
            ) : (
              <Folder className="h-5 w-5 text-gray-400" />
            )}

            {/* Название категории */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${category.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {category.name}
                </span>
                {!category.isActive && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    Неактивна
                  </span>
                )}
                {category.productsCount !== undefined && category.productsCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {category.productsCount} товаров
                  </span>
                )}
              </div>
              {category.description && (
                <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleToggleActive(category)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={category.isActive ? 'Деактивировать' : 'Активировать'}
            >
              {category.isActive ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => handleEditCategory(category)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Редактировать"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeletingCategory(category)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Подкатегории */}
        {hasChildren && isExpanded && (
          <div>
            {category.subcategories!.map((subcat) => renderCategory(subcat, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderTree className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Категории товаров</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadCategories}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить
            </button>
            <button
              onClick={handleCreateCategory}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Создать категорию
            </button>
          </div>
        </div>

        {/* Список категорий */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {!categories || categories.length === 0 ? (
            <div className="p-12 text-center">
              <FolderTree className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Категории не созданы</p>
              <button
                onClick={handleCreateCategory}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Создать первую категорию
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((category) => renderCategory(category))}
            </div>
          )}
        </div>

        {/* Подсказка */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <FolderTree className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Советы по работе с категориями:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Создавайте подкатегории выбрав родительскую категорию при создании</li>
                <li>Используйте деактивацию вместо удаления, чтобы сохранить историю</li>
                <li>Категории с товарами нельзя удалить - сначала переместите товары</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно создания/редактирования */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={handleModalSuccess}
        category={editingCategory}
        categories={flatCategories}
      />

      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        loading={isDeleting}
        title="Удалить категорию?"
        message={
          deletingCategory
            ? `Вы уверены, что хотите удалить категорию "${deletingCategory.name}"?${
                deletingCategory.productsCount && deletingCategory.productsCount > 0
                  ? ` В этой категории ${deletingCategory.productsCount} товаров.`
                  : ''
              }`
            : ''
        }
      />
    </Layout>
  );
};
