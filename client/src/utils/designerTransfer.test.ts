import type { ProductWorkflowItem } from '../types';
import {
  canTransferDesigner,
  getCommonDesignerId,
  getTransferableProductIds,
  pruneTransferSelection,
  toggleTransferSelection,
} from './designerTransfer';

function item(
  id: number,
  designerId: number | null,
  allowedActions: string[] = ['transfer_designer']
): ProductWorkflowItem {
  return {
    id,
    designerId,
    permissions: { allowedActions, editableFields: [], canEditCard: false },
  } as unknown as ProductWorkflowItem;
}

describe('designerTransfer helpers', () => {
  it('allows transfer only when the server granted transfer_designer', () => {
    expect(canTransferDesigner(item(1, 5))).toBe(true);
    expect(canTransferDesigner(item(1, 5, ['manage_assets']))).toBe(false);
    expect(canTransferDesigner({ id: 1 } as ProductWorkflowItem)).toBe(false);
  });

  it('lists ids of transferable cards in page order', () => {
    const products = [item(3, 5), item(1, 5, []), item(2, 6)];

    expect(getTransferableProductIds(products)).toEqual([3, 2]);
  });

  it('drops selected ids that are no longer on the page or no longer transferable', () => {
    const products = [item(1, 5), item(2, 5, [])];

    expect(pruneTransferSelection([1, 2, 99], products)).toEqual([1]);
  });

  it('toggles a card in the selection without mutating it', () => {
    const selection = [1, 2];

    expect(toggleTransferSelection(selection, 3)).toEqual([1, 2, 3]);
    expect(toggleTransferSelection(selection, 2)).toEqual([1]);
    expect(selection).toEqual([1, 2]);
  });

  it('returns the shared designer only when every selected card has the same one', () => {
    expect(getCommonDesignerId([item(1, 5), item(2, 5)])).toBe(5);
    expect(getCommonDesignerId([item(1, 5), item(2, 6)])).toBeNull();
    expect(getCommonDesignerId([item(1, null)])).toBeNull();
    expect(getCommonDesignerId([])).toBeNull();
  });
});
