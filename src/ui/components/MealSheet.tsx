import { f7, Link, List, ListButton, PageContent, Sheet, Toolbar } from 'framework7-react';
import { removeMeal } from '../../app/week';
import { useDeps } from '../hooks/useDeps';
import { removeMealConfirmMessage } from '../view-models/week';

interface MealSheetProps {
  mealId: string | null;
  title: string;
  opened: boolean;
  onClose(): void;
}

/** The bottom sheet for one Meal (FR-017). */
export function MealSheet({ mealId, title, opened, onClose }: MealSheetProps) {
  const deps = useDeps();

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
      onSheetClosed={onClose}
      backdrop
      swipeToClose
    >
      <Toolbar>
        <div className="left">
          <Link sheetClose>Anuluj</Link>
        </div>
        <div className="title">{title}</div>
        <div className="right" />
      </Toolbar>
      <PageContent>
        <List inset>
          <ListButton color="red" onClick={confirmRemove}>
            Usuń posiłek
          </ListButton>
        </List>
      </PageContent>
    </Sheet>
  );
}
