import { randomBytes } from 'crypto';
import {
  issueSessionToken,
  verifySessionToken,
  TEAMOMF_SESSION_COOKIE,
} from './session';

const key = new Uint8Array(randomBytes(32));
const claims = {
  email: 'someone@teamomf.test',
  username: 'someone',
  displayName: 'Some One',
};

describe('session tokens', () => {
  it('round-trips the claims', async () => {
    const token = await issueSessionToken({
      key,
      claims,
      expiresInSeconds: 60,
    });
    await expect(verifySessionToken({ key, token })).resolves.toEqual(claims);
  });

  it('rejects a token signed with a different key', async () => {
    const token = await issueSessionToken({
      key,
      claims,
      expiresInSeconds: 60,
    });
    const otherKey = new Uint8Array(randomBytes(32));
    await expect(
      verifySessionToken({ key: otherKey, token }),
    ).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await issueSessionToken({
      key,
      claims,
      expiresInSeconds: -10,
    });
    await expect(verifySessionToken({ key, token })).rejects.toThrow();
  });

  it('rejects a tampered payload', async () => {
    const token = await issueSessionToken({
      key,
      claims,
      expiresInSeconds: 60,
    });
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...claims, email: 'attacker@evil.test' }),
    ).toString('base64url');
    await expect(
      verifySessionToken({ key, token: `${header}.${forged}.${signature}` }),
    ).rejects.toThrow();
  });

  it('rejects a garbage token', async () => {
    await expect(
      verifySessionToken({ key, token: 'not-a-jwt' }),
    ).rejects.toThrow();
  });

  it('exposes a stable cookie name', () => {
    expect(TEAMOMF_SESSION_COOKIE).toBe('teamomf-session');
  });
});
