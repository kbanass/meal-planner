import { App, Link, Toolbar, ToolbarPane, View, Views } from 'framework7-react';
import { dishesRoutes, settingsRoutes, shoppingRoutes, weekRoutes } from './routes';

export function AppShell() {
  return (
    <App name="Planer posiłków" theme="auto">
      <Views tabs className="safe-areas">
        {/* Framework7's tabbar with icons: on iOS the pane is the floating glass bar with a
            highlight behind the active tab. */}
        <Toolbar tabbar icons bottom>
          <ToolbarPane>
            <Link tabLink="#view-week" tabLinkActive iconF7="calendar" text="Tydzień" />
            <Link tabLink="#view-dishes" iconF7="book" text="Dania" />
            <Link tabLink="#view-shopping" iconF7="cart" text="Lista zakupów" />
            <Link tabLink="#view-settings" iconF7="gear" text="Ustawienia" />
          </ToolbarPane>
        </Toolbar>
        <View id="view-week" main tab tabActive url="/" routes={weekRoutes} />
        <View id="view-dishes" tab url="/dishes/" routes={dishesRoutes} />
        <View id="view-shopping" tab url="/" routes={shoppingRoutes} />
        <View id="view-settings" tab url="/" routes={settingsRoutes} />
      </Views>
    </App>
  );
}
