import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/** Current hash format version, so the scheme can be rotated later. */
const VERSION = '1';
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/**
 * Derives a storable hash for a plaintext password.
 *
 * The output is self-describing: `scrypt$<version>$<salt-b64>$<key-b64>`.
 * A fresh random salt is generated per password, so two users with the same
 * password produce different hashes.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(normalize(password), salt, KEY_BYTES);
  return [
    'scrypt',
    VERSION,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

/**
 * Verifies a plaintext password against a stored hash.
 *
 * Uses a constant-time comparison so that a failed comparison does not leak
 * how much of the hash matched. Returns false rather than throwing for
 * malformed hashes, so a corrupt row cannot be distinguished from a wrong
 * password by an attacker.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 4) {
    return false;
  }
  const [scheme, version, saltB64, keyB64] = parts;
  if (scheme !== 'scrypt' || version !== VERSION) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, 'base64');
    expected = Buffer.from(keyB64, 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  const derived = await scrypt(normalize(password), salt, expected.length);
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

/**
 * Unicode-normalises the password so that visually identical passwords typed
 * on different platforms hash identically.
 */
function normalize(password: string): string {
  return password.normalize('NFKC');
}
