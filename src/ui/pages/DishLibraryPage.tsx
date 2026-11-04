import { useLiveQuery } from 'dexie-react-hooks';
import { Block, Link, List, ListItem, Navbar, NavLeft, NavRight, NavTitle, Page } from 'framework7-react';
import { selectLibrary } from '../../domain/dishes';
import { DishAvatar } from '../components/DishAvatar';
import { useDeps } from '../hooks/useDeps';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';

export function DishLibraryPage() {
  const deps = useDeps();
  const dishes = useLiveQuery(() => deps.dishes.list(), [deps]);
  const library = selectLibrary(dishes ?? []);
  const avatarSize = useMediaQuery(DESKTOP_QUERY) ? 120 : 48;

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
      <div className="page-wide page-wide-grid">
        {dishes !== undefined && library.length === 0 ? (
          <Block>
            <p>Nie masz jeszcze żadnych dań. Dodaj pierwsze przyciskiem +.</p>
          </Block>
        ) : (
          <List className="card-grid">
            {library.map((dish) => (
              <ListItem key={dish.id} link={`/dishes/${dish.id}/`} title={dish.name}>
                <div slot="media">
                  <DishAvatar name={dish.name} photo={dish.photo} size={avatarSize} />
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </div>
    </Page>
  );
}
