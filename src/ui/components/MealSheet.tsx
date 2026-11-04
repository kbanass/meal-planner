import { useLiveQuery } from 'dexie-react-hooks';
import {
  BlockTitle,
  f7,
  Link,
  List,
  ListButton,
  ListInput,
  ListItem,
  PageContent,
  Sheet,
  Toolbar,
} from 'framework7-react';
import { useState } from 'react';
import { removeMeal, saveMeal } from '../../app/week';
import { rescaleMealDraft, type FieldError, type MealDraft } from '../../domain/meals';
import { useDeps } from '../hooks/useDeps';
import { goneMessage, mealErrorMessage, mealFieldDomId, mealSheet } from '../view-models/meal-sheet';
import { removeMealConfirmMessage } from '../view-models/week';

interface MealSheetProps {
  mealId: string | null;
  title: string;
  opened: boolean;
  onClose(): void;
}

/** The bottom sheet for one Meal: Servings, its values, and removal (FR-017–FR-019). */
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

  function setServings(text: string) {
    if (!draft || !source) return;
    setEdited(rescaleMealDraft(draft, source, text));
    clearError('servings');
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
    onClose();
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
            </List>

            <BlockTitle>Składniki (w tym posiłku)</BlockTitle>
            <List strong inset dividersIos>
              {values.ingredients.map((ingredient) => (
                <ListItem
                  key={ingredient.productId}
                  title={ingredient.name}
                  after={`${ingredient.display} ${ingredient.unitLabel}`}
                />
              ))}
            </List>

            <BlockTitle>Makro (ten posiłek)</BlockTitle>
            <List strong inset dividersIos>
              {values.macros.map((macro) => (
                <ListItem key={macro.key} title={macro.label} after={macro.display} />
              ))}
            </List>
          </>
        )}
        <List strong inset>
          <ListButton color="red" onClick={confirmRemove}>
            Usuń posiłek
          </ListButton>
        </List>
      </PageContent>
    </Sheet>
  );
}
