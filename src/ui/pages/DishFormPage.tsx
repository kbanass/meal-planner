import { useLiveQuery } from 'dexie-react-hooks';
import {
  BlockTitle,
  Button,
  f7,
  Link,
  List,
  ListButton,
  ListInput,
  Navbar,
  NavRight,
  Page,
} from 'framework7-react';
import type { Router } from 'framework7/types';
import { useRef, useState } from 'react';
import { deleteDish, saveDish, type PhotoChange } from '../../app/dishes';
import {
  addIngredient,
  removeIngredient,
  type DishDraft,
  type DishFieldErrors,
} from '../../domain/dishes';
import type { Product } from '../../domain/types';
import { DishAvatar } from '../components/DishAvatar';
import { IngredientsEditor } from '../components/IngredientsEditor';
import { MacroFields } from '../components/MacroFields';
import { useDeps } from '../hooks/useDeps';
import { useBlobUrl } from '../hooks/usePhotoUrl';
import {
  currentDraft,
  deleteDishConfirmMessage,
  errorMessage,
  fieldDomId,
  firstInvalidField,
  formTitle,
  indexProducts,
  photoErrorMessage,
  photoSection,
} from '../view-models/dish-form';
import { sheetValues } from '../view-models/meal-sheet';

interface DishFormPageProps {
  f7route: Router.Route;
  f7router: Router.Router;
}

export function DishFormPage({ f7route, f7router }: DishFormPageProps) {
  const deps = useDeps();
  const dishId = f7route.params.dishId;
  const stored = useLiveQuery(
    async () => (dishId === undefined ? null : ((await deps.dishes.get(dishId)) ?? null)),
    [deps, dishId],
  );
  const products = useLiveQuery(() => deps.products.list(), [deps]);
  const productsById = indexProducts(products ?? []);

  const [edited, setDraft] = useState<DishDraft | null>(null);
  const draft = currentDraft(edited, stored);
  // The same rows as the Meal sheet (FR-047).
  const values = draft ? sheetValues(draft, products ?? []) : null;
  const [errors, setErrors] = useState<DishFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [photoChange, setPhotoChange] = useState<PhotoChange>({ kind: 'keep' });
  const pendingPhotoUrl = useBlobUrl(photoChange.kind === 'set' ? photoChange.file : null);
  const storedPhoto = stored?.photo ?? null;
  const photo = photoSection(storedPhoto, photoChange);
  const fileInput = useRef<HTMLInputElement>(null);

  function clearError(path: string) {
    setErrors((current) => {
      if (!(path in current)) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
  }

  const error = (path: string) => {
    const code = errors[path];
    return code ? errorMessage(code) : undefined;
  };

  function focusField(path: string) {
    const element = document.getElementById(fieldDomId(path));
    element?.scrollIntoView({ block: 'center' });
    element?.focus();
  }

  function pickProduct(product: Product) {
    if (!draft) return;
    const result = addIngredient(draft, product.id);
    const amountPath = `ingredients[${result.index}].amount`;
    if (result.existed) {
      f7.toast.show({ text: errorMessage('duplicateProduct'), closeTimeout: 2000 });
    } else {
      setDraft(result.draft);
      setErrors({});
    }
    // Wait for the new row to render before focusing it.
    requestAnimationFrame(() => focusField(amountPath));
  }

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const result = await saveDish(deps, {
        id: dishId,
        draft,
        productsById,
        photoChange,
      });
      if (result.kind === 'saved') {
        if (result.photoError) {
          f7.toast.show({ text: photoErrorMessage(result.photoError), closeTimeout: 4000 });
        }
        f7router.back();
        return;
      }
      setErrors(result.errors);
      const first = firstInvalidField(result.errors);
      if (first) requestAnimationFrame(() => focusField(first));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!stored) return;
    f7.dialog.confirm(deleteDishConfirmMessage(stored.name), async () => {
      await deleteDish(deps, stored.id);
      f7router.back();
    });
  }

  return (
    <Page>
      <Navbar title={formTitle(dishId)} backLink>
        <NavRight>
          <Link onClick={save}>Zapisz</Link>
        </NavRight>
      </Navbar>
      {draft && values && (
        <div className="page-wide">
          <section className="dish-photo" aria-label="Zdjęcie">
            <DishAvatar
              name={draft.name}
              photo={photo.shows === 'stored' ? storedPhoto : null}
              src={photo.shows === 'pending' ? pendingPhotoUrl : null}
              size={160}
            />
            <div className="dish-photo-actions">
              <Button type="button" small tonal onClick={() => fileInput.current?.click()}>
                {photo.pickLabel}
              </Button>
              {photo.canRemove && (
                <Button
                  type="button"
                  small
                  color="red"
                  onClick={() => setPhotoChange({ kind: 'remove' })}
                >
                  Usuń zdjęcie
                </Button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setPhotoChange({ kind: 'set', file });
                // Allow picking the same file again after removing it.
                event.target.value = '';
              }}
            />
          </section>

          <List strong inset className="form-card">
            <ListInput
              outline
              label="Nazwa"
              type="text"
              inputId={fieldDomId('name')}
              value={draft.name}
              onInput={(event) => {
                setDraft({ ...draft, name: event.target.value });
                clearError('name');
              }}
              errorMessage={error('name')}
              errorMessageForce={errors.name !== undefined}
            />
            <ListInput
              outline
              label="Liczba porcji"
              type="text"
              inputmode="decimal"
              inputId={fieldDomId('servingsYield')}
              value={draft.servingsYield}
              onInput={(event) => {
                setDraft({ ...draft, servingsYield: event.target.value });
                clearError('servingsYield');
              }}
              errorMessage={error('servingsYield')}
              errorMessageForce={errors.servingsYield !== undefined}
            />
          </List>

          <BlockTitle>Składniki</BlockTitle>
          <IngredientsEditor
            rows={values.ingredients}
            inputId={fieldDomId}
            error={error}
            onAmountChange={(index, amount) => {
              setDraft({
                ...draft,
                ingredients: draft.ingredients.map((other, i) =>
                  i === index ? { ...other, amount } : other,
                ),
              });
              clearError(`ingredients[${index}].amount`);
            }}
            onRemove={(index) => {
              setDraft(removeIngredient(draft, index));
              setErrors({});
            }}
            onPick={pickProduct}
          />

          <BlockTitle>Makro (całe danie)</BlockTitle>
          <MacroFields
            macros={values.macros}
            inputId={fieldDomId}
            error={error}
            onChange={(key, text) => {
              setDraft({ ...draft, macros: { ...draft.macros, [key]: text } });
              clearError(`macros.${key}`);
            }}
          />

          <BlockTitle>Notatki</BlockTitle>
          <List strong inset className="form-card">
            <ListInput
              outline
              label="Notatki"
              type="textarea"
              resizable
              inputId={fieldDomId('notes')}
              value={draft.notes}
              onInput={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </List>

          {stored && (
            // The same red list button as "Usuń posiłek" in the Meal sheet.
            <List strong inset className="form-card">
              <ListButton color="red" onClick={confirmDelete}>
                Usuń danie
              </ListButton>
            </List>
          )}
        </div>
      )}
    </Page>
  );
}
