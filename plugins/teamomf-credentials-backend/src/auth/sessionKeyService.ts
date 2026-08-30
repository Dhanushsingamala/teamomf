import {
  coreServices,
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import { randomBytes } from 'crypto';

/** Symmetric key used to sign and verify TEAMOMF session cookies. */
export type TeamomfSessionKeyService = {
  key: Uint8Array;
  /** How long an issued session cookie stays valid. */
  sessionTtlSeconds: number;
};

const DEFAULT_TTL_SECONDS = 12 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

/**
 * A root-scoped service, so that the `teamomf-credentials` plugin (which
 * *issues* session cookies) and the `auth` backend module (which *verifies*
 * them) share one key without either needing access to the other's database.
 *
 * The secret is never written to source or to a config file. If
 * `teamomf.auth.sessionSecret` is not supplied, a random key is generated at
 * boot -- which simply means existing sessions stop being valid when the
 * backend restarts.
 */
export const teamomfSessionKeyRef = createServiceRef<TeamomfSessionKeyService>({
  id: 'teamomf.session-key',
  scope: 'root',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.rootLogger,
      },
      async factory({ config, logger }) {
        const sessionTtlSeconds =
          config.getOptionalNumber('teamomf.auth.sessionTtlSeconds') ??
          DEFAULT_TTL_SECONDS;

        const configured = config.getOptionalString(
          'teamomf.auth.sessionSecret',
        );

        if (configured) {
          if (configured.length < MIN_SECRET_LENGTH) {
            throw new Error(
              `teamomf.auth.sessionSecret must be at least ${MIN_SECRET_LENGTH} characters`,
            );
          }
          logger.info(
            'TEAMOMF credentials: using configured session signing secret',
          );
          return {
            key: new TextEncoder().encode(configured),
            sessionTtlSeconds,
          };
        }

        logger.info(
          'TEAMOMF credentials: no teamomf.auth.sessionSecret configured, ' +
            'generating an ephemeral signing key. Logins will be invalidated ' +
            'on backend restart.',
        );
        return {
          key: new Uint8Array(randomBytes(32)),
          sessionTtlSeconds,
        };
      },
    }),
});
