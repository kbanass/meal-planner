import type { Router } from 'framework7/types';
import { DishFormPage } from './pages/DishFormPage';
import { DishLibraryPage } from './pages/DishLibraryPage';
import { ProductsPage } from './pages/ProductsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { WeekPage } from './pages/WeekPage';

type Routes = Router.RouteParameters[];

export const weekRoutes: Routes = [{ path: '/', component: WeekPage }];
export const dishesRoutes: Routes = [
  { path: '/', redirect: '/dishes/' },
  { path: '/dishes/', component: DishLibraryPage },
  { path: '/dishes/new/', component: DishFormPage },
  { path: '/dishes/:dishId/', component: DishFormPage },
  { path: '/products/', component: ProductsPage },
];
export const shoppingRoutes: Routes = [{ path: '/', component: ShoppingListPage }];
export const settingsRoutes: Routes = [{ path: '/', component: SettingsPage }];
