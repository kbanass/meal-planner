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

/** Saves the Extra edit sheet. Blank text is 'invalid' and keeps the sheet open. */
export async function saveExtra(
  deps: { shopping: ShoppingRepository },
  id: string,
  edit: { text: string; amount: string; ticked: boolean },
): Promise<'saved' | 'invalid'> {
  // A missing Extra (deleted in another tab) has nothing left to save; the sheet just closes.
  return (await deps.shopping.updateExtra(id, edit)) === 'empty' ? 'invalid' : 'saved';
}

/** Shares what is left to buy (FR-025–FR-027). Call it with no await before it (research R5). */
export function shareList(
  deps: { sharer: TextSharer },
  text: string,
): Promise<'shared' | 'copied' | 'cancelled'> {
  return deps.sharer.share(text);
}
