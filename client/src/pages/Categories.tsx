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
  EyeOff,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  IconButton,
  PageHeader,
  Spinner,
} from '../components/ui';
import categoryApi from '../services/categoryApi';
import type { Category } from '../types';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

export const Categories: React.FC = () => {
  const toast = useToast();
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
      toast.error('Не удалось загрузить категории');
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
      toast.success('Категория удалена');
    } catch (error) {
      console.error('Ошибка удаления категории:', error);
      toast.error('Не удалось удалить категорию');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      await categoryApi.updateCategory(category.id, {
        isActive: !category.isActive,
      });
      await loadCategories();
      toast.success(category.isActive ? 'Категория деактивирована' : 'Категория активирована');
    } catch (error) {
      console.error('Ошибка изменения статуса категории:', error);
      toast.error('Не удалось изменить статус категории');
    }
  };

  const handleModalSuccess = async () => {
    await loadCategories();
  };

  const getFlatCategories = (cats: Category[]): Category[] => {
    if (!cats || !Array.isArray(cats)) return [];
    let result: Category[] = [];
    cats.forEach((cat) => {
      result.push(cat);
      if (cat.subcategories && cat.subcategories.length > 0) {
        result = result.concat(getFlatCategories(cat.subcategories));
      }
    });
    return result;
  };

  const flatCategories = getFlatCategories(categories);

  const renderCategoryRow = (category: Category, level: number = 0) => {
    const hasChildren = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id}>
        <div
          className={cn(
            'group flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-brand-white p-3 transition-colors duration-150',
            'hover:bg-surface-inset/60',
            !category.isActive && 'opacity-70',
            level > 0 && 'ml-3 border-l-[3px] border-l-brand-yellow/30'
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {hasChildren ? (
              <IconButton
                icon={isExpanded ? ChevronDown : ChevronRight}
                title={isExpanded ? 'Свернуть' : 'Развернуть'}
                size="sm"
                onClick={() => handleToggleExpand(category.id)}
              />
            ) : (
              <div className="w-8 shrink-0" />
            )}

            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-5 w-5 shrink-0 text-brand-yellow" />
              ) : (
                <Folder className="h-5 w-5 shrink-0 text-text-muted" />
              )
            ) : (
              <Folder className="h-5 w-5 shrink-0 text-text-muted" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'text-body-medium',
                    category.isActive ? 'text-brand-black' : 'text-text-muted'
                  )}
                >
                  {category.name}
                </span>
                {!category.isActive && <Badge variant="outline">Неактивна</Badge>}
                {category.productsCount !== undefined && category.productsCount > 0 && (
                  <Badge variant="info">{category.productsCount} товаров</Badge>
                )}
              </div>
              {category.description && (
                <p className="mt-0.5 truncate text-caption text-text-muted">{category.description}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              icon={category.isActive ? Eye : EyeOff}
              title={category.isActive ? 'Деактивировать' : 'Активировать'}
              onClick={() => handleToggleActive(category)}
            />
            <IconButton icon={Edit} title="Редактировать" onClick={() => handleEditCategory(category)} />
            <IconButton
              icon={Trash2}
              title="Удалить"
              variant="danger"
              onClick={() => setDeletingCategory(category)}
            />
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2 border-l border-border-subtle pl-3 ml-4">
            {category.subcategories!.map((subcat) => renderCategoryRow(subcat, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" color="brand" useLucide />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Категории товаров"
          description="Дерево категорий для организации каталога"
          icon={FolderTree}
          actions={
            <>
              <Button variant="secondary" leftIcon={RefreshCw} onClick={loadCategories}>
                Обновить
              </Button>
              <Button variant="primary" leftIcon={Plus} onClick={handleCreateCategory}>
                Создать категорию
              </Button>
            </>
          }
        />

        {!categories || categories.length === 0 ? (
          <Card>
            <EmptyState
              icon={FolderTree}
              title="Категории не созданы"
              description="Создайте первую категорию для организации товаров"
              action={
                <Button variant="primary" leftIcon={Plus} onClick={handleCreateCategory}>
                  Создать первую категорию
                </Button>
              }
              className="py-12"
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <Card key={category.id} variant="elevated">
                <CardBody className="p-4 md:p-5">
                  {renderCategoryRow(category)}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        <Alert variant="info" icon={FolderTree} title="Советы по работе с категориями:">
          <ul className="list-inside list-disc space-y-1">
            <li>Создавайте подкатегории, выбрав родительскую категорию при создании</li>
            <li>Используйте деактивацию вместо удаления, чтобы сохранить историю</li>
            <li>Категории с товарами нельзя удалить — сначала переместите товары</li>
          </ul>
        </Alert>
      </div>

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
