import { SignJWT, jwtVerify } from 'jose';

/** Name of the HTTP-only cookie holding the TEAMOMF login session. */
export const TEAMOMF_SESSION_COOKIE = 'teamomf-session';

const ISSUER = 'teamomf-credentials';
const AUDIENCE = 'teamomf-portal';

/** The verified identity carried by a TEAMOMF session cookie. */
export type TeamomfSessionClaims = {
  /** Lower-cased email; used to resolve the catalog User entity. */
  email: string;
  /** Lower-cased login name. */
  username: string;
  /** Human readable name, used for the profile shown in the UI. */
  displayName: string;
};

/**
 * Signs a short-lived session token.
 *
 * This token only asserts "this browser proved knowledge of this user's
 * password". It is deliberately *not* a Backstage identity token -- the auth
 * provider exchanges it for one, which is where catalog ownership claims get
 * attached.
 */
export async function issueSessionToken(options: {
  key: Uint8Array;
  claims: TeamomfSessionClaims;
  expiresInSeconds: number;
}): Promise<string> {
  const { key, claims, expiresInSeconds } = options;
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    email: claims.email,
    username: claims.username,
    name: claims.displayName,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.username)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(key);
}

/**
 * Verifies a session token's signature, issuer, audience and expiry.
 *
 * Throws if the token is invalid in any way.
 */
export async function verifySessionToken(options: {
  key: Uint8Array;
  token: string;
}): Promise<TeamomfSessionClaims> {
  const { key, token } = options;
  const { payload } = await jwtVerify(token, key, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const email = payload.email;
  const username = payload.username;
  const displayName = payload.name;

  if (
    typeof email !== 'string' ||
    typeof username !== 'string' ||
    typeof displayName !== 'string'
  ) {
    throw new Error('TEAMOMF session token is missing required claims');
  }

  return { email, username, displayName };
}
