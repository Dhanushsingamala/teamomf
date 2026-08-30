import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { parseAllDocuments, stringify } from 'yaml';

type Entity = {
  apiVersion: string;
  kind: string;
  metadata: { name: string; [key: string]: unknown };
  spec?: Record<string, unknown>;
};

/** Turns a free-text team name into a valid Backstage entity name. */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

function readEntities(path: string): Entity[] {
  if (!existsSync(path)) {
    return [];
  }
  const docs = parseAllDocuments(readFileSync(path, 'utf8'));
  return docs
    .map(doc => doc.toJS() as Entity | null)
    .filter((e): e is Entity => Boolean(e && e.kind && e.metadata?.name));
}

function writeEntities(path: string, entities: Entity[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const header = [
    '# TEAMOMF organisation.',
    '#',
    '# Managed by `yarn teamomf:user`. Every entry corresponds to a real',
    '# person with a real credential in the TEAMOMF credential store.',
    '',
  ].join('\n');
  const body = entities.map(e => stringify(e, { lineWidth: 0 })).join('---\n');
  writeFileSync(path, `${header}${body}`, 'utf8');
}

/**
 * Adds or updates a User entity and their Group in the org catalog file.
 *
 * Existing entities are merged rather than replaced, so re-running the CLI to
 * rotate a password does not discard hand-made edits to the org chart.
 */
export function upsertOrgEntities(options: {
  path: string;
  username: string;
  email: string;
  displayName: string;
  teamName: string;
  githubLogin?: string;
}): { userRef: string; groupRef: string; created: boolean } {
  const { path, username, email, displayName, teamName, githubLogin } = options;
  const teamSlug = slugify(teamName);
  const entities = readEntities(path);

  const existingUserIndex = entities.findIndex(
    e => e.kind === 'User' && e.metadata.name === username,
  );

  const annotations: Record<string, string> = {
    ...((entities[existingUserIndex]?.metadata?.annotations as Record<
      string,
      string
    >) ?? {}),
  };
  if (githubLogin) {
    annotations['github.com/user-login'] = githubLogin;
  }

  const user: Entity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: username,
      ...(Object.keys(annotations).length > 0 ? { annotations } : {}),
    },
    spec: {
      profile: { displayName, email },
      memberOf: [teamSlug],
    },
  };

  if (existingUserIndex >= 0) {
    const previous = entities[existingUserIndex];
    const previousMemberOf = (previous.spec?.memberOf as string[]) ?? [];
    // Preserve any additional group memberships added by hand.
    user.spec!.memberOf = Array.from(new Set([teamSlug, ...previousMemberOf]));
    entities[existingUserIndex] = user;
  } else {
    entities.push(user);
  }

  const hasGroup = entities.some(
    e => e.kind === 'Group' && e.metadata.name === teamSlug,
  );
  if (!hasGroup) {
    entities.push({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Group',
      metadata: { name: teamSlug, title: teamName.trim() },
      spec: {
        type: 'team',
        profile: { displayName: teamName.trim() },
        children: [],
      },
    });
  }

  // Groups after users reads better, but the catalog does not care.
  entities.sort((a, b) =>
    `${a.kind}:${a.metadata.name}`.localeCompare(
      `${b.kind}:${b.metadata.name}`,
    ),
  );

  writeEntities(path, entities);

  return {
    userRef: `user:default/${username}`,
    groupRef: `group:default/${teamSlug}`,
    created: existingUserIndex < 0,
  };
}

/** Removes a User entity from the org catalog file. */
export function removeOrgUser(path: string, username: string): boolean {
  const entities = readEntities(path);
  const remaining = entities.filter(
    e => !(e.kind === 'User' && e.metadata.name === username),
  );
  if (remaining.length === entities.length) {
    return false;
  }
  writeEntities(path, remaining);
  return true;
}
