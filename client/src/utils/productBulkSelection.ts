import type { Product, ProductLifecycleRouteStage } from '../types';

export type ProductBulkActionMode = 'assign_designer' | 'start_lifecycle';

export function canStartProductLifecycle(product: Product): boolean {
  return product.isActive && product.lifecycleStatus !== 'archived';
}

export function isLifecycleRestart(product: Product | null): boolean {
  if (!product) return false;

  return Boolean(
    Number(product.lifecycleRunNumber) > 0
    || product.lifecycleCompletedAt
    || product.lifecycleRoute?.length
    || (product.lifecycleStartedAt && product.lifecycleStatus !== 'new')
  );
}

type LifecycleStartValidationParams = {
  stages: ProductLifecycleRouteStage[];
  designerId: string;
  reason: string;
  requiresReason: boolean;
};

export function getLifecycleStartValidationError({
  stages,
  designerId,
  reason,
  requiresReason,
}: LifecycleStartValidationParams): string | null {
  if (stages.length === 0) return 'Выберите хотя бы один этап.';
  if (stages.includes('design') && !designerId) return 'Выберите дизайнера.';
  if (requiresReason && !reason.trim()) return 'Укажите причину перезапуска цикла.';
  return null;
}

export function getBulkSelectableProductIds(
  products: Product[],
  mode: ProductBulkActionMode
): number[] {
  return products
    .filter((product) => (
      mode === 'assign_designer'
        ? product.lifecycleStatus === 'new'
        : canStartProductLifecycle(product)
    ))
    .map((product) => product.id);
}
