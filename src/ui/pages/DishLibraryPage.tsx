import { useLiveQuery } from 'dexie-react-hooks';
import { Block, Link, Navbar, NavLeft, NavRight, NavTitle, Page } from 'framework7-react';
import { selectLibrary } from '../../domain/dishes';
import { DishCard } from '../components/DishCard';
import { useDeps } from '../hooks/useDeps';
import { dishCard } from '../view-models/dishes';

export function DishLibraryPage() {
  const deps = useDeps();
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const library = selectLibrary(dishes ?? []);

  return (
    <Page>
      {/* Explicit order: Navbar renders its title prop before any children, which would put
          NavLeft after the title and break the iOS centring. */}
      <Navbar>
        <NavLeft>
          <Link href="/products/">Produkty</Link>
        </NavLeft>
        <NavTitle>Dania</NavTitle>
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
          <div className="dish-grid">
            {library.map((dish) => (
              <DishCard key={dish.id} card={dishCard(dish)} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
