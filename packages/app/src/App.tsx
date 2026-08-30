import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
// Registered explicitly, like catalogPlugin above, rather than relying on
// `app.packages: all` auto-discovery. This plugin contributes the "GitHub
// Actions" entity tab, which only renders for entities carrying the
// github.com/project-slug annotation.
import githubActionsPlugin from '@backstage-community/plugin-github-actions/alpha';
import { navModule } from './modules/nav';
import { homeModule } from './modules/home';
import { authModule } from './modules/auth';
import { themeModule } from './modules/theme';

export default createApp({
  features: [
    catalogPlugin,
    githubActionsPlugin,
    navModule,
    homeModule,
    authModule,
    // Overrides Backstage's built-in light/dark themes.
    themeModule,
  ],
});
