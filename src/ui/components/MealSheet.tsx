import { useLiveQuery } from 'dexie-react-hooks';
import {
  Block,
  BlockTitle,
  f7,
  Link,
  List,
  ListButton,
  ListInput,
  PageContent,
  Sheet,
  Toolbar,
} from 'framework7-react';
import { useState } from 'react';
import { removeMeal, restoreMealFromDish, saveMeal } from '../../app/week';
import {
  addMealIngredient,
  removeMealIngredient,
  rescaleMealDraft,
  type FieldError,
  type MealDraft,
} from '../../domain/meals';
import type { Product } from '../../domain/types';
import { useDeps } from '../hooks/useDeps';
import {
  detachedNote,
  detachToast,
  goneMessage,
  mealErrorMessage,
  mealFieldDomId,
  mealSheet,
  restoreConfirmMessage,
} from '../view-models/meal-sheet';
import { removeMealConfirmMessage } from '../view-models/week';
import { IngredientRow } from './IngredientRow';
import { ProductPicker } from './ProductPicker';

interface MealSheetProps {
  mealId: string | null;
  title: string;
  opened: boolean;
  onClose(): void;
}

type MacroKey = keyof MealDraft['macros'];

/**
 * The bottom sheet for one Meal (FR-017–FR-029): Servings, name, Ingredients and Macros as they
 * apply to this Meal, "przywróć z Dania" for a Detached Meal, and removal.
 */
export function MealSheet({ mealId, title, opened, onClose }: MealSheetProps) {
  const deps = useDeps();
  const meal = useLiveQuery(
    () => (mealId === null ? undefined : deps.week.getMeal(mealId)),
    [deps, mealId],
  );
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const products = useLiveQuery(() => deps.products.list(), [deps]);
  const [edited, setEdited] = useState<MealDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const model = mealSheet(edited, meal, dishes, products);
  const { draft, source, values } = model;

  function error(path: string): string | undefined {
    const code = errors[path];
    return code ? mealErrorMessage(code) : undefined;
  }

  function clearError(path: string) {
    setErrors((current) => {
      if (!(path in current)) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
  }

  function update(next: MealDraft, path: string) {
    setEdited(next);
    clearError(path);
  }

  function setServings(text: string) {
    if (!draft || !source) return;
    update(rescaleMealDraft(draft, source, text), 'servings');
  }

  function setAmount(index: number, amount: string) {
    if (!draft) return;
    const ingredients = draft.ingredients.map((other, i) => (i === index ? { ...other, amount } : other));
    update({ ...draft, ingredients }, `ingredients[${index}].amount`);
  }

  function setMacro(key: MacroKey, text: string) {
    if (!draft) return;
    update({ ...draft, macros: { ...draft.macros, [key]: text } }, `macros.${key}`);
  }

  function focusField(path: string) {
    const element = document.getElementById(mealFieldDomId(path));
    element?.scrollIntoView({ block: 'center' });
    element?.focus();
  }

  function pickProduct(product: Product) {
    if (!draft) return;
    const result = addMealIngredient(draft, product.id);
    if (result.existed) {
      f7.toast.show({ text: mealErrorMessage('duplicateProduct'), closeTimeout: 2000 });
    } else {
      setEdited(result.draft);
      setErrors({});
    }
    // Wait for the new row to render before focusing it.
    requestAnimationFrame(() => focusField(`ingredients[${result.index}].amount`));
  }

  async function save() {
    if (mealId === null || !draft) return;
    const result = await saveMeal(deps, {
      mealId,
      draft,
      dishesById: model.dishesById,
      productsById: model.productsById,
    });
    if (result.kind === 'invalid') {
      setErrors(result.errors);
      return;
    }
    if (result.kind === 'gone') f7.dialog.alert(goneMessage);
    if (result.kind === 'saved' && result.detachedNow) {
      f7.toast.show({ text: detachToast, closeTimeout: 3000 });
    }
    onClose();
  }

  function confirmRestore() {
    if (mealId === null) return;
    f7.dialog.confirm(restoreConfirmMessage(model.dishName), async () => {
      const result = await restoreMealFromDish(deps, mealId);
      if (result.kind === 'gone') f7.dialog.alert(goneMessage);
      onClose();
    });
  }

  function confirmRemove() {
    if (mealId === null) return;
    f7.dialog.confirm(removeMealConfirmMessage(title), async () => {
      await removeMeal(deps, mealId);
      onClose();
    });
  }

  return (
    <Sheet
      className="meal-sheet"
      opened={opened}
      onSheetOpen={() => {
        // Each opening starts from the stored Meal (FR-018).
        setEdited(null);
        setErrors({});
      }}
      onSheetClosed={onClose}
      backdrop
      swipeToClose
    >
      <Toolbar>
        <div className="left">
          <Link sheetClose>Anuluj</Link>
        </div>
        <div className="title">{title}</div>
        <div className="right">
          <Link onClick={() => void save()}>Zapisz</Link>
        </div>
      </Toolbar>
      <PageContent>
        {draft && values && (
          <>
            {model.detached && (
              <Block>
                <p className="meal-detached-note">{detachedNote}</p>
              </Block>
            )}
            <List strong inset>
              <ListInput
                outline
                label="Porcje"
                type="text"
                inputmode="decimal"
                inputId={mealFieldDomId('servings')}
                value={draft.servings}
                onInput={(event) => setServings((event.target as HTMLInputElement).value)}
                errorMessage={error('servings')}
                errorMessageForce={errors.servings !== undefined}
              />
              <ListInput
                outline
                label="Nazwa"
                type="text"
                inputId={mealFieldDomId('name')}
                value={draft.name}
                onInput={(event) =>
                  update({ ...draft, name: (event.target as HTMLInputElement).value }, 'name')
                }
                errorMessage={error('name')}
                errorMessageForce={errors.name !== undefined}
              />
            </List>

            <BlockTitle>Składniki (w tym posiłku)</BlockTitle>
            {values.ingredients.length > 0 && (
              // Plain list markup: Framework7's <List> only puts its own item components inside <ul>.
              <div className="list list-strong inset">
                <ul>
                  {values.ingredients.map((ingredient, index) => {
                    const path = `ingredients[${index}]`;
                    return (
                      <IngredientRow
                        key={ingredient.productId}
                        inputId={mealFieldDomId(`${path}.amount`)}
                        name={ingredient.name}
                        unit={ingredient.unitLabel}
                        amount={ingredient.amount}
                        error={error(`${path}.productId`) ?? error(`${path}.amount`)}
                        onAmountChange={(amount) => setAmount(index, amount)}
                        onRemove={() => {
                          setEdited(removeMealIngredient(draft, index));
                          setErrors({});
                        }}
                      />
                    );
                  })}
                </ul>
              </div>
            )}
            {/* Its "Nowy produkt" sheet opens on top of this one and closes on its own. */}
            <ProductPicker onPick={pickProduct} insideSheet />

            <BlockTitle>Makro (ten posiłek)</BlockTitle>
            <List strong inset>
              {values.macros.map((macro) => (
                <ListInput
                  outline
                  key={macro.key}
                  label={macro.label}
                  type="text"
                  inputmode="decimal"
                  inputId={mealFieldDomId(`macros.${macro.key}`)}
                  value={macro.text}
                  onInput={(event) => setMacro(macro.key, (event.target as HTMLInputElement).value)}
                  errorMessage={error(`macros.${macro.key}`)}
                  errorMessageForce={errors[`macros.${macro.key}`] !== undefined}
                />
              ))}
            </List>
          </>
        )}
        <List strong inset>
          {model.detached && <ListButton onClick={confirmRestore}>Przywróć z dania</ListButton>}
          <ListButton color="red" onClick={confirmRemove}>
            Usuń posiłek
          </ListButton>
        </List>
      </PageContent>
    </Sheet>
  );
}
