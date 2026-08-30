import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(
      verifyPassword('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('never stores the plaintext password', async () => {
    const password = 'super-secret-value-123';
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
  });

  it('produces a different hash for the same password each time', async () => {
    const a = await hashPassword('same-password-here');
    const b = await hashPassword('same-password-here');
    expect(a).not.toEqual(b);
    // ...but both still verify, proving the salt travels with the hash.
    await expect(verifyPassword('same-password-here', a)).resolves.toBe(true);
    await expect(verifyPassword('same-password-here', b)).resolves.toBe(true);
  });

  it('uses the documented self-describing format', async () => {
    const hash = await hashPassword('anything');
    const [scheme, version, salt, key] = hash.split('$');
    expect(scheme).toBe('scrypt');
    expect(version).toBe('1');
    expect(Buffer.from(salt, 'base64')).toHaveLength(16);
    expect(Buffer.from(key, 'base64')).toHaveLength(64);
  });

  it.each([
    ['empty string', ''],
    ['not a hash at all', 'hello'],
    ['wrong scheme', 'bcrypt$1$AAAA$BBBB'],
    ['wrong version', 'scrypt$99$AAAA$BBBB'],
    ['too few segments', 'scrypt$1$AAAA'],
  ])('returns false for a malformed hash: %s', async (_name, bad) => {
    await expect(verifyPassword('anything', bad)).resolves.toBe(false);
  });

  it('treats unicode-equivalent passwords as equal', async () => {
    // Precomposed e-acute (U+00E9) vs "e" + combining acute (U+0301): the
    // same grapheme with different bytes. NFKC normalisation means both
    // forms unlock the same account.
    const precomposed = `caf${String.fromCharCode(0x00e9)}-password`;
    const decomposed = `cafe${String.fromCharCode(0x0301)}-password`;
    expect(precomposed).not.toBe(decomposed);

    const hash = await hashPassword(precomposed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });
});
