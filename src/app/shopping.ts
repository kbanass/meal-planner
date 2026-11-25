import type { TextSharer } from '../data/ports';
import type { ShoppingRepository } from '../data/shopping-repository';
import { decideAdjustmentSave } from '../domain/shopping';
import type { IsoDate } from '../domain/types';

export type SaveAdjustmentResult =
  | { kind: 'saved' }
  | { kind: 'cleared' }
  | { kind: 'unchanged' }
  | { kind: 'invalid' };

/** Saves the amount sheet (FR-017–FR-019). Unchanged or invalid text writes nothing. */
export async function saveAdjustment(
  deps: { shopping: ShoppingRepository },
  input: { weekStart: IsoDate; productId: string; text: string; filledText: string; planned: number },
): Promise<SaveAdjustmentResult> {
  const decision = decideAdjustmentSave(input);
  switch (decision.kind) {
    case 'set':
      await deps.shopping.updateProductState(input.weekStart, input.productId, {
        adjustment: decision.adjustment,
      });
      return { kind: 'saved' };
    case 'clear':
      await deps.shopping.updateProductState(input.weekStart, input.productId, { adjustment: null });
      return { kind: 'cleared' };
    default:
      return decision;
  }
}

/** Adds an Extra (FR-022). Blank text adds nothing. */
export async function addExtra(
  deps: { shopping: ShoppingRepository },
  weekStart: IsoDate,
  text: string,
  amount = '',
): Promise<'added' | 'empty'> {
  return (await deps.shopping.addExtra(weekStart, text, amount)) ? 'added' : 'empty';
}

/** Shares what is left to buy (FR-025–FR-027). Call it with no await before it (research R5). */
export function shareList(
  deps: { sharer: TextSharer },
  text: string,
): Promise<'shared' | 'copied' | 'cancelled'> {
  return deps.sharer.share(text);
}
