import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  createProxyAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { createTeamomfCredentialsAuthenticator } from './auth/authenticator';
import { teamomfSessionKeyRef } from './auth/sessionKeyService';

/**
 * Registers the `teamomf` auth provider.
 *
 * The sign-in resolver is the important part: it looks the authenticated
 * email up against a real `User` entity in the catalog and issues the
 * identity via `signInWithCatalogUser`. That call is what attaches real
 * `ownershipEntityRefs` (the user's Group memberships) to the Backstage
 * token, which is what the permission policy will read later.
 *
 * If no matching User entity exists, sign-in fails. That is intentional --
 * it means a person can only log in if they are genuinely in the org chart.
 */
export const authModuleTeamomfCredentialsProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'teamomf-credentials-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        sessionKey: teamomfSessionKeyRef,
      },
      async init({ providers, sessionKey }) {
        providers.registerProvider({
          providerId: 'teamomf',
          factory: createProxyAuthProviderFactory({
            authenticator: createTeamomfCredentialsAuthenticator(sessionKey),
            async signInResolver({ result }, ctx) {
              return await ctx.signInWithCatalogUser({
                filter: {
                  kind: 'User',
                  'spec.profile.email': result.email,
                },
              });
            },
          }),
        });
      },
    });
  },
});
