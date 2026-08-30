import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';

/**
 * Replaces the default Backstage sign-in experience with the TEAMOMF
 * credential login.
 *
 * This is the new frontend system's mechanism: a SignInPageBlueprint
 * extension contributed by an app module. There is no SignInPage prop on
 * createApp to set, and no legacy App.tsx route to add.
 */
export const authModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    SignInPageBlueprint.make({
      params: {
        loader: async () =>
          (await import('./TeamomfSignInPage')).TeamomfSignInPage,
      },
    }),
  ],
});
