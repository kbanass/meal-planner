import type { Router } from 'framework7/types';
import { PlaceholderPage } from './components/PlaceholderPage';
import { DishFormPage } from './pages/DishFormPage';
import { DishLibraryPage } from './pages/DishLibraryPage';
import { ProductsPage } from './pages/ProductsPage';

type Routes = Router.RouteParameters[];

function placeholder(title: string): Routes {
  return [{ path: '/', component: PlaceholderPage, options: { props: { title } } }];
}

export const weekRoutes: Routes = placeholder('Tydzień');
export const dishesRoutes: Routes = [
  { path: '/', redirect: '/dishes/' },
  { path: '/dishes/', component: DishLibraryPage },
  { path: '/dishes/new/', component: DishFormPage },
  { path: '/dishes/:dishId/', component: DishFormPage },
  { path: '/products/', component: ProductsPage },
];
export const shoppingRoutes: Routes = placeholder('Lista zakupów');
export const settingsRoutes: Routes = placeholder('Ustawienia');
