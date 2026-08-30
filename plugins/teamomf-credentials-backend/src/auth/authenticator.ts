import { AuthenticationError } from '@backstage/errors';
import { createProxyAuthenticator } from '@backstage/plugin-auth-node';
import { parse as parseCookie } from 'cookie';
import {
  TEAMOMF_SESSION_COOKIE,
  verifySessionToken,
  type TeamomfSessionClaims,
} from './session';
import type { TeamomfSessionKeyService } from './sessionKeyService';

/**
 * A Backstage proxy authenticator that trusts the TEAMOMF session cookie.
 *
 * "Proxy" here is Backstage's term for any provider where the request already
 * carries proof of identity, rather than starting an OAuth redirect. Our
 * proof is the signed cookie issued by the teamomf-credentials plugin.
 */
export function createTeamomfCredentialsAuthenticator(
  sessionKey: TeamomfSessionKeyService,
) {
  return createProxyAuthenticator<undefined, TeamomfSessionClaims, undefined>({
    defaultProfileTransform: async (result: TeamomfSessionClaims) => ({
      profile: {
        email: result.email,
        displayName: result.displayName,
      },
    }),

    initialize: () => undefined,

    async authenticate({ req }) {
      const cookies = parseCookie(req.headers.cookie ?? '');
      const token = cookies[TEAMOMF_SESSION_COOKIE];

      if (!token) {
        throw new AuthenticationError(
          'No TEAMOMF session cookie present. Sign in with your TEAMOMF credentials first.',
        );
      }

      try {
        const claims = await verifySessionToken({
          key: sessionKey.key,
          token,
        });
        return { result: claims };
      } catch (error) {
        throw new AuthenticationError(
          'The TEAMOMF session is invalid or has expired. Please sign in again.',
        );
      }
    },
  });
}
