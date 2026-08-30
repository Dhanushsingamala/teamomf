import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import { serialize as serializeCookie, parse as parseCookie } from 'cookie';
import express from 'express';
import Router from 'express-promise-router';
import { hashPassword, verifyPassword } from '../auth/password';
import { issueSessionToken, TEAMOMF_SESSION_COOKIE } from '../auth/session';
import type { TeamomfSessionKeyService } from '../auth/sessionKeyService';
import type { CredentialsStore } from '../database/CredentialsStore';
import { LoginThrottle } from './loginThrottle';

/**
 * A hash of a random value, used to equalise response timing when the
 * submitted username does not exist. Without it, the endpoint leaks which
 * usernames are real via a measurably faster rejection.
 */
let decoyHashPromise: Promise<string> | undefined;
function decoyHash(): Promise<string> {
  decoyHashPromise ??= hashPassword(`decoy-${Math.random()}-${Date.now()}`);
  return decoyHashPromise;
}

export async function createRouter(options: {
  store: CredentialsStore;
  logger: LoggerService;
  config: Config;
  sessionKey: TeamomfSessionKeyService;
}): Promise<express.Router> {
  const { store, logger, config, sessionKey } = options;

  const secureCookie = (
    config.getOptionalString('backend.baseUrl') ?? ''
  ).startsWith('https://');

  const throttle = new LoginThrottle();
  const router = Router();
  router.use(express.json());

  const cookieOptions = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: secureCookie,
    path: '/',
  };

  /**
   * Exchanges a username/password for an HTTP-only session cookie.
   *
   * Deliberately does not return a token in the body: an HTTP-only cookie
   * cannot be read by page JavaScript, and Backstage's ProxiedSignInPage
   * sends it automatically via `credentials: 'include'`.
   */
  router.post('/login', async (req, res) => {
    const login =
      typeof req.body?.username === 'string' ? req.body.username : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!login || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const throttleKey = login.trim().toLowerCase();
    const blockedFor = throttle.check(throttleKey);
    if (blockedFor > 0) {
      logger.warn(
        `TEAMOMF login throttled for "${throttleKey}" for another ${Math.ceil(
          blockedFor / 1000,
        )}s`,
      );
      res
        .status(429)
        .json({ error: 'Too many failed attempts. Try again shortly.' });
      return;
    }

    const user = await store.findByLogin(login);

    // Always run a verification, even for an unknown user, so response
    // timing does not reveal whether the account exists.
    let ok = false;
    if (user) {
      ok = await verifyPassword(password, user.passwordHash);
    } else {
      await verifyPassword(password, await decoyHash());
    }

    if (!user || !ok) {
      throttle.recordFailure(throttleKey);
      logger.warn(`TEAMOMF login failed for "${throttleKey}"`);
      // One generic message for both cases: no user enumeration.
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    throttle.recordSuccess(throttleKey);

    const token = await issueSessionToken({
      key: sessionKey.key,
      claims: {
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
      expiresInSeconds: sessionKey.sessionTtlSeconds,
    });

    res.setHeader(
      'Set-Cookie',
      serializeCookie(TEAMOMF_SESSION_COOKIE, token, {
        ...cookieOptions,
        maxAge: sessionKey.sessionTtlSeconds,
      }),
    );
    logger.info(`TEAMOMF login succeeded for "${user.username}"`);
    res.status(200).json({ username: user.username, email: user.email });
  });

  /** Clears the session cookie. */
  router.post('/logout', async (req, res) => {
    const existing = parseCookie(req.headers.cookie ?? '')[
      TEAMOMF_SESSION_COOKIE
    ];
    if (existing) {
      logger.info('TEAMOMF session cookie cleared');
    }
    res.setHeader(
      'Set-Cookie',
      serializeCookie(TEAMOMF_SESSION_COOKIE, '', {
        ...cookieOptions,
        maxAge: 0,
      }),
    );
    res.status(204).end();
  });

  return router;
}
