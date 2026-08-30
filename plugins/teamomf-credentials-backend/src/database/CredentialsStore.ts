import { resolvePackagePath } from '@backstage/backend-plugin-api';
import type { Knex } from 'knex';

const MIGRATIONS_TABLE = 'teamomf_credentials_migrations';

const migrationsDir = resolvePackagePath(
  '@internal/plugin-teamomf-credentials-backend',
  'migrations',
);

const TABLE = 'teamomf_credentials';

/** A credential row, without the password hash. */
export type TeamomfUserRecord = {
  username: string;
  email: string;
  displayName: string;
};

type Row = {
  username: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: Date | string;
  updated_at: Date | string;
};

/**
 * Data access for locally stored portal credentials.
 *
 * Nothing in this class ever accepts or returns a plaintext password -- only
 * already-derived hashes, produced by `hashPassword`.
 */
export class CredentialsStore {
  private constructor(private readonly client: Knex) {}

  /**
   * Applies pending migrations and returns a ready store.
   *
   * `migrationsDir` can be overridden by the provisioning CLI, which runs
   * from a bundled location where package resolution differs.
   */
  static async create(
    client: Knex,
    options?: { migrationsDir?: string },
  ): Promise<CredentialsStore> {
    await client.migrate.latest({
      directory: options?.migrationsDir ?? migrationsDir,
      tableName: MIGRATIONS_TABLE,
    });
    return new CredentialsStore(client);
  }

  /**
   * Looks a user up by either username or email, case-insensitively.
   *
   * Returns the password hash so the caller can verify it; callers must not
   * log or return this value.
   */
  async findByLogin(
    login: string,
  ): Promise<(TeamomfUserRecord & { passwordHash: string }) | undefined> {
    const needle = login.trim().toLowerCase();
    const row = await this.client<Row>(TABLE)
      .where('username', needle)
      .orWhere('email', needle)
      .first();

    if (!row) {
      return undefined;
    }
    return {
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      passwordHash: row.password_hash,
    };
  }

  /**
   * Creates or updates a user. Used only by the provisioning CLI.
   *
   * Keyed on username: re-running with the same username rotates that user's
   * password rather than creating a duplicate.
   */
  async upsertUser(user: {
    username: string;
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<'created' | 'updated'> {
    const username = user.username.trim().toLowerCase();
    const email = user.email.trim().toLowerCase();

    const existing = await this.client<Row>(TABLE)
      .where('username', username)
      .first();

    if (existing) {
      await this.client<Row>(TABLE).where('username', username).update({
        email,
        display_name: user.displayName,
        password_hash: user.passwordHash,
        updated_at: new Date(),
      });
      return 'updated';
    }

    await this.client<Row>(TABLE).insert({
      username,
      email,
      display_name: user.displayName,
      password_hash: user.passwordHash,
    });
    return 'created';
  }

  /** Lists provisioned users, for the CLI's `list` command. */
  async listUsers(): Promise<TeamomfUserRecord[]> {
    const rows = await this.client<Row>(TABLE)
      .select('username', 'email', 'display_name')
      .orderBy('username');
    return rows.map(r => ({
      username: r.username,
      email: r.email,
      displayName: r.display_name,
    }));
  }

  /** Removes a user. Returns true if a row was deleted. */
  async deleteUser(username: string): Promise<boolean> {
    const deleted = await this.client<Row>(TABLE)
      .where('username', username.trim().toLowerCase())
      .delete();
    return deleted > 0;
  }
}
