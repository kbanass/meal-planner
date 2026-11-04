import { useLiveQuery } from 'dexie-react-hooks';
import { Block, Link, List, ListItem, Navbar, NavRight, Page } from 'framework7-react';
import { selectLibrary } from '../../domain/dishes';
import { useDeps } from '../hooks/useDeps';

export function DishLibraryPage() {
  const deps = useDeps();
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const library = selectLibrary(dishes ?? []);

  return (
    <Page>
      <Navbar title="Dania">
        <NavRight>
          <Link href="/dishes/new/" iconF7="plus" iconOnly aria-label="Dodaj danie" />
        </NavRight>
      </Navbar>
      <div className="page-wide">
        {dishes !== undefined && library.length === 0 ? (
          <Block>
            <p>Nie masz jeszcze żadnych dań. Dodaj pierwsze przyciskiem +.</p>
          </Block>
        ) : (
          <List className="card-grid">
            {library.map((dish) => (
              <ListItem key={dish.id} link={`/dishes/${dish.id}/`} title={dish.name} />
            ))}
          </List>
        )}
      </div>
    </Page>
  );
}
