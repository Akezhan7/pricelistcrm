import type { ProductWorkflowItem } from '../types';

export function canTransferDesigner(product: ProductWorkflowItem): boolean {
  return Boolean(product.permissions?.allowedActions.includes('transfer_designer'));
}

export function getTransferableProductIds(products: ProductWorkflowItem[]): number[] {
  return products.filter(canTransferDesigner).map((product) => product.id);
}

export function pruneTransferSelection(
  selectedIds: number[],
  products: ProductWorkflowItem[]
): number[] {
  const transferable = new Set(getTransferableProductIds(products));
  return selectedIds.filter((id) => transferable.has(id));
}

export function toggleTransferSelection(selectedIds: number[], productId: number): number[] {
  return selectedIds.includes(productId)
    ? selectedIds.filter((id) => id !== productId)
    : [...selectedIds, productId];
}

export function getCommonDesignerId(products: ProductWorkflowItem[]): number | null {
  const owners = new Set(products.map((product) => product.designerId ?? null));
  if (owners.size !== 1) return null;

  const [owner] = Array.from(owners);
  return owner ?? null;
}
