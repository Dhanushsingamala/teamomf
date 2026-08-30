/**
 * Credential-based authentication for the TEAMOMF developer portal.
 *
 * This package exposes two backend features which are registered separately
 * in `packages/backend/src/index.ts`:
 *
 *  - `teamomfCredentialsPlugin` -- owns the credential store and the
 *    login/logout HTTP endpoints.
 *  - `authModuleTeamomfCredentialsProvider` -- registers the `teamomf` auth
 *    provider, which turns a valid session into a Backstage identity backed
 *    by a real catalog User entity.
 */
export { teamomfCredentialsPlugin } from './plugin';
export { authModuleTeamomfCredentialsProvider } from './module';
export { CredentialsStore } from './database/CredentialsStore';
export type { TeamomfUserRecord } from './database/CredentialsStore';
export { hashPassword, verifyPassword } from './auth/password';
export { TEAMOMF_SESSION_COOKIE } from './auth/session';
