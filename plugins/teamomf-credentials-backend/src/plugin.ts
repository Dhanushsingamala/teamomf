import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { teamomfSessionKeyRef } from './auth/sessionKeyService';
import { CredentialsStore } from './database/CredentialsStore';
import { createRouter } from './service/router';

/**
 * Backend plugin that owns the TEAMOMF local credential store and exposes
 * the login/logout endpoints at `/api/teamomf-credentials/*`.
 *
 * It does **not** issue Backstage identities. It only proves possession of a
 * password and hands out a session cookie; the `auth` module in this same
 * package exchanges that cookie for a real Backstage identity token.
 */
export const teamomfCredentialsPlugin = createBackendPlugin({
  pluginId: 'teamomf-credentials',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        database: coreServices.database,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        sessionKey: teamomfSessionKeyRef,
      },
      async init({ http, database, logger, config, sessionKey }) {
        const store = await CredentialsStore.create(await database.getClient());

        http.use(await createRouter({ store, logger, config, sessionKey }));

        // Signing in is by definition unauthenticated, so these two routes
        // must opt out of the default "credentials required" policy.
        http.addAuthPolicy({ path: '/login', allow: 'unauthenticated' });
        http.addAuthPolicy({ path: '/logout', allow: 'unauthenticated' });
      },
    });
  },
});
