import type { ProductLifecycleStatus } from '../types';

type ProductsListSearchParams = {
  limit: number;
  categoryId?: number | null;
  lifecycleStatus?: ProductLifecycleStatus | '';
};

export function parseCategoryIdParam(value: string | null) {
  if (!value) return null;

  const categoryId = Number(value);
  return Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
}

export function buildProductsListSearchParams({
  limit,
  categoryId,
  lifecycleStatus,
}: ProductsListSearchParams) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (categoryId) params.set('categoryId', String(categoryId));
  if (lifecycleStatus) params.set('lifecycleStatus', lifecycleStatus);
  return params;
}
