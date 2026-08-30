import { resolve } from 'path';
import knexFactory, { type Knex } from 'knex';
import { hashPassword, verifyPassword } from '../auth/password';
import { CredentialsStore } from './CredentialsStore';

const migrationsDir = resolve(__dirname, '../../migrations');

describe('CredentialsStore', () => {
  let client: Knex;
  let store: CredentialsStore;

  beforeEach(async () => {
    // A real SQLite database, in memory, running the real migration.
    client = knexFactory({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    store = await CredentialsStore.create(client, { migrationsDir });
  });

  afterEach(async () => {
    await client.destroy();
  });

  const addUser = async (
    overrides: Partial<{ username: string; email: string }> = {},
  ) =>
    store.upsertUser({
      username: overrides.username ?? 'ada',
      email: overrides.email ?? 'ada@teamomf.test',
      displayName: 'Ada Lovelace',
      passwordHash: await hashPassword('analytical-engine-1843'),
    });

  it('creates the table via the real migration', async () => {
    await expect(client.schema.hasTable('teamomf_credentials')).resolves.toBe(
      true,
    );
  });

  it('starts empty, with no seeded accounts', async () => {
    await expect(store.listUsers()).resolves.toEqual([]);
  });

  it('stores a user and finds them by username', async () => {
    await expect(addUser()).resolves.toBe('created');
    const found = await store.findByLogin('ada');
    expect(found).toMatchObject({
      username: 'ada',
      email: 'ada@teamomf.test',
      displayName: 'Ada Lovelace',
    });
  });

  it('finds a user by email as well as username', async () => {
    await addUser();
    await expect(store.findByLogin('ada@teamomf.test')).resolves.toBeDefined();
  });

  it('matches logins case-insensitively and ignores surrounding space', async () => {
    await addUser();
    await expect(store.findByLogin('  ADA  ')).resolves.toBeDefined();
    await expect(store.findByLogin('ADA@TeamOMF.test')).resolves.toBeDefined();
  });

  it('returns undefined for an unknown login', async () => {
    await expect(store.findByLogin('nobody')).resolves.toBeUndefined();
  });

  it('stores only a verifiable hash, never the plaintext', async () => {
    await addUser();
    const row = await client('teamomf_credentials').first();
    expect(row.password_hash).not.toContain('analytical-engine-1843');
    await expect(
      verifyPassword('analytical-engine-1843', row.password_hash),
    ).resolves.toBe(true);
  });

  it('updates rather than duplicates when the username repeats', async () => {
    await addUser();
    await expect(
      store.upsertUser({
        username: 'ada',
        email: 'ada@teamomf.test',
        displayName: 'Ada Lovelace',
        passwordHash: await hashPassword('a-rotated-password'),
      }),
    ).resolves.toBe('updated');

    await expect(store.listUsers()).resolves.toHaveLength(1);
    const found = await store.findByLogin('ada');
    await expect(
      verifyPassword('a-rotated-password', found!.passwordHash),
    ).resolves.toBe(true);
    await expect(
      verifyPassword('analytical-engine-1843', found!.passwordHash),
    ).resolves.toBe(false);
  });

  it('deletes a user', async () => {
    await addUser();
    await expect(store.deleteUser('ada')).resolves.toBe(true);
    await expect(store.findByLogin('ada')).resolves.toBeUndefined();
    await expect(store.deleteUser('ada')).resolves.toBe(false);
  });
});
