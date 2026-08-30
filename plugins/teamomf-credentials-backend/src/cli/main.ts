import { existsSync, readFileSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';
import knexFactory from 'knex';
import { parse as parseYaml } from 'yaml';
import { hashPassword } from '../auth/password';
import { CredentialsStore } from '../database/CredentialsStore';
import { ask, askHidden } from './prompt';
import { removeOrgUser, slugify, upsertOrgEntities } from './orgCatalog';

const PLUGIN_ID = 'teamomf-credentials';
const ORG_CATALOG_RELATIVE = 'catalog/teamomf-org.yaml';

/**
 * Resolves the SQLite file the backend uses for this plugin.
 *
 * Mirrors Backstage's own naming: `<connection.directory>/<pluginId>.sqlite`,
 * with the directory resolved relative to the backend's working directory
 * (`packages/backend`), exactly as the running backend resolves it.
 */
function resolveDatabaseFile(repoRoot: string): string {
  const configPath = join(repoRoot, 'app-config.yaml');
  if (!existsSync(configPath)) {
    throw new Error(`Could not find app-config.yaml at ${configPath}`);
  }
  const config = parseYaml(readFileSync(configPath, 'utf8'));
  const database = config?.backend?.database;

  if (database?.client !== 'better-sqlite3' && database?.client !== 'sqlite3') {
    throw new Error(
      `This CLI only supports the SQLite database clients, but backend.database.client is "${database?.client}".`,
    );
  }

  const directory = database?.connection?.directory;
  if (!directory) {
    throw new Error(
      'backend.database.connection.directory is not set in app-config.yaml. ' +
        'The CLI cannot locate the credential database.',
    );
  }

  const backendCwd = join(repoRoot, 'packages', 'backend');
  const dbDir = isAbsolute(directory)
    ? directory
    : resolve(backendCwd, directory);
  return join(dbDir, `${PLUGIN_ID}.sqlite`);
}

async function openStore(repoRoot: string) {
  const filename = resolveDatabaseFile(repoRoot);
  const client = knexFactory({
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
  });
  const store = await CredentialsStore.create(client, {
    migrationsDir: join(
      repoRoot,
      'plugins',
      'teamomf-credentials-backend',
      'migrations',
    ),
  });
  return { store, client, filename };
}

function fail(message: string): never {
  process.stderr.write(`\nError: ${message}\n\n`);
  process.exit(1);
}

async function commandAdd(repoRoot: string) {
  process.stdout.write(
    '\nAdd a TEAMOMF portal user.\n' +
      'This creates a real credential and a real catalog User entity.\n\n',
  );

  const username = slugify(await ask('Login username (e.g. dhanush): '));
  if (!username) {
    fail('A username is required.');
  }

  const email = (await ask('Email address: ')).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`"${email}" does not look like an email address.`);
  }

  const displayName = await ask('Full name: ');
  if (!displayName) {
    fail('A full name is required.');
  }

  const teamName = await ask('Team / group name (e.g. Platform Engineering): ');
  if (!teamName || !slugify(teamName)) {
    fail('A team name is required.');
  }

  const githubLogin = await ask(
    'GitHub username (optional, press Enter to skip): ',
  );

  const password = await askHidden('Password (hidden): ');
  if (password.length < 12) {
    fail('Password must be at least 12 characters.');
  }
  const confirm = await askHidden('Confirm password: ');
  if (password !== confirm) {
    fail('Passwords did not match.');
  }

  const { store, client, filename } = await openStore(repoRoot);
  try {
    const passwordHash = await hashPassword(password);
    const outcome = await store.upsertUser({
      username,
      email,
      displayName,
      passwordHash,
    });

    const orgPath = join(repoRoot, ORG_CATALOG_RELATIVE);
    const { userRef, groupRef } = upsertOrgEntities({
      path: orgPath,
      username,
      email,
      displayName,
      teamName,
      githubLogin: githubLogin || undefined,
    });

    process.stdout.write(
      `\nCredential ${outcome} in ${filename}\n` +
        `Catalog entity written to ${ORG_CATALOG_RELATIVE}\n\n` +
        `  User:  ${userRef}\n` +
        `  Group: ${groupRef}\n\n` +
        'The catalog refreshes within about a minute; restart the backend to apply immediately.\n' +
        `Then sign in at http://localhost:3000 as "${username}" or "${email}".\n\n`,
    );
  } finally {
    await client.destroy();
  }
}

async function commandList(repoRoot: string) {
  const { store, client } = await openStore(repoRoot);
  try {
    const users = await store.listUsers();
    if (users.length === 0) {
      process.stdout.write(
        '\nNo TEAMOMF users provisioned yet. Run: yarn teamomf:user add\n\n',
      );
      return;
    }
    process.stdout.write('\nProvisioned TEAMOMF users:\n\n');
    for (const user of users) {
      process.stdout.write(
        `  ${user.username.padEnd(20)} ${user.email.padEnd(32)} ${
          user.displayName
        }\n`,
      );
    }
    process.stdout.write('\n');
  } finally {
    await client.destroy();
  }
}

async function commandRemove(repoRoot: string, username: string) {
  if (!username) {
    fail('Usage: yarn teamomf:user remove <username>');
  }
  const { store, client } = await openStore(repoRoot);
  try {
    const removedCredential = await store.deleteUser(username);
    const removedEntity = removeOrgUser(
      join(repoRoot, ORG_CATALOG_RELATIVE),
      username,
    );
    process.stdout.write(
      `\nCredential removed: ${removedCredential}\n` +
        `Catalog entity removed: ${removedEntity}\n\n`,
    );
  } finally {
    await client.destroy();
  }
}

export async function main(argv: string[]): Promise<void> {
  const repoRoot = process.env.TEAMOMF_REPO_ROOT ?? process.cwd();
  const [command = 'add', ...rest] = argv;

  switch (command) {
    case 'add':
      await commandAdd(repoRoot);
      break;
    case 'list':
      await commandList(repoRoot);
      break;
    case 'remove':
      await commandRemove(repoRoot, rest[0]);
      break;
    default:
      fail(
        `Unknown command "${command}". Usage: yarn teamomf:user [add|list|remove <username>]`,
      );
  }
}
