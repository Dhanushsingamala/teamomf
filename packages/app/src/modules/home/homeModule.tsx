import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';

/**
 * TEAMOMF home page widgets.
 *
 * Each widget renders live data from the catalog or the signed-in user's
 * identity. None of them contain sample entities, placeholder metrics or
 * hardcoded business data -- where there is nothing to show, the card says so
 * and explains what would make real data appear.
 *
 * Placement is controlled by `app.extensions -> page:home -> defaultConfig`
 * in app-config.yaml; the `name` param below is the key used there.
 */

const welcome = HomePageWidgetBlueprint.make({
  name: 'teamomf-welcome',
  params: {
    name: 'TeamomfWelcome',
    title: 'Overview',
    description:
      'Greets the signed-in user and summarises live catalog totals.',
    layout: { width: { defaultColumns: 8 }, height: { defaultRows: 5 } },
    components: async () => ({
      Content: (await import('./widgets/Welcome')).Welcome,
    }),
  },
});

const quickActions = HomePageWidgetBlueprint.make({
  name: 'teamomf-quick-actions',
  params: {
    name: 'TeamomfQuickActions',
    title: 'Quick actions',
    description: 'Shortcuts into the catalog, APIs, docs and scaffolder.',
    layout: { width: { defaultColumns: 4 }, height: { defaultRows: 5 } },
    components: async () => ({
      Content: (await import('./widgets/QuickActions')).QuickActions,
    }),
  },
});

const ownedEntities = HomePageWidgetBlueprint.make({
  name: 'teamomf-owned',
  params: {
    name: 'TeamomfMyWork',
    title: 'Owned by you and your teams',
    description:
      'Catalog entities owned by the signed-in user or their groups.',
    layout: { width: { defaultColumns: 6 }, height: { defaultRows: 5 } },
    components: async () => ({
      Content: (await import('./widgets/CatalogCards')).OwnedEntities,
    }),
  },
});

const services = HomePageWidgetBlueprint.make({
  name: 'teamomf-services',
  params: {
    name: 'TeamomfServices',
    title: 'Services & components',
    description: 'Components registered in the software catalog.',
    layout: { width: { defaultColumns: 4 }, height: { defaultRows: 5 } },
    components: async () => ({
      Content: (await import('./widgets/CatalogCards')).Services,
    }),
  },
});

const apis = HomePageWidgetBlueprint.make({
  name: 'teamomf-apis',
  params: {
    name: 'TeamomfApis',
    title: 'APIs',
    description: 'API entities registered in the catalog.',
    layout: { width: { defaultColumns: 4 }, height: { defaultRows: 5 } },
    components: async () => ({
      Content: (await import('./widgets/CatalogCards')).Apis,
    }),
  },
});

const documentation = HomePageWidgetBlueprint.make({
  name: 'teamomf-docs',
  params: {
    name: 'TeamomfDocs',
    title: 'Documentation',
    description: 'Entities that publish TechDocs from their repository.',
    layout: { width: { defaultColumns: 4 }, height: { defaultRows: 5 } },
    components: async () => ({
      Content: (await import('./widgets/CatalogCards')).Documentation,
    }),
  },
});

const templates = HomePageWidgetBlueprint.make({
  name: 'teamomf-templates',
  params: {
    name: 'TeamomfTemplates',
    title: 'Software templates',
    description: 'Scaffolder templates available in this portal.',
    layout: { width: { defaultColumns: 6 }, height: { defaultRows: 4 } },
    components: async () => ({
      Content: (await import('./widgets/CatalogCards')).Templates,
    }),
  },
});

const repositories = HomePageWidgetBlueprint.make({
  name: 'teamomf-repositories',
  params: {
    name: 'TeamomfRepositories',
    title: 'Source repositories',
    description: 'Real GitHub repositories linked from catalog entities.',
    layout: { width: { defaultColumns: 6 }, height: { defaultRows: 4 } },
    components: async () => ({
      Content: (await import('./widgets/CatalogCards')).Repositories,
    }),
  },
});

export const homeModule = createFrontendModule({
  pluginId: 'home',
  extensions: [
    welcome,
    quickActions,
    ownedEntities,
    services,
    apis,
    documentation,
    templates,
    repositories,
  ],
});
