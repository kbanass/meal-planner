import type { Router } from 'framework7/types';
import { PlaceholderPage } from './components/PlaceholderPage';

type Routes = Router.RouteParameters[];

function placeholder(title: string): Routes {
  return [{ path: '/', component: PlaceholderPage, options: { props: { title } } }];
}

export const weekRoutes: Routes = placeholder('Tydzień');
export const dishesRoutes: Routes = placeholder('Dania');
export const shoppingRoutes: Routes = placeholder('Lista zakupów');
export const settingsRoutes: Routes = placeholder('Ustawienia');
