import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseAllDocuments } from 'yaml';
import { removeOrgUser, slugify, upsertOrgEntities } from './orgCatalog';

function entitiesIn(path: string) {
  return parseAllDocuments(readFileSync(path, 'utf8'))
    .map(d => d.toJS())
    .filter(Boolean);
}

describe('slugify', () => {
  it.each([
    ['Platform Engineering', 'platform-engineering'],
    ['  Finance  ', 'finance'],
    ['R&D / Data', 'r-d-data'],
    ['already-a-slug', 'already-a-slug'],
  ])('turns %s into %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('upsertOrgEntities', () => {
  let path: string;

  beforeEach(() => {
    path = join(
      mkdtempSync(join(tmpdir(), 'teamomf-org-')),
      'teamomf-org.yaml',
    );
  });

  const add = (overrides: Record<string, string> = {}) =>
    upsertOrgEntities({
      path,
      username: 'ada',
      email: 'ada@teamomf.test',
      displayName: 'Ada Lovelace',
      teamName: 'Platform Engineering',
      ...overrides,
    });

  it('writes a User and a Group', () => {
    const result = add();
    expect(result).toMatchObject({
      userRef: 'user:default/ada',
      groupRef: 'group:default/platform-engineering',
      created: true,
    });

    const entities = entitiesIn(path);
    const user = entities.find(e => e.kind === 'User');
    const group = entities.find(e => e.kind === 'Group');

    expect(user.metadata.name).toBe('ada');
    expect(group.metadata.name).toBe('platform-engineering');
  });

  it('writes the email where the sign-in resolver looks for it', () => {
    // The resolver filters on spec.profile.email; if this shape changes,
    // login silently stops resolving to a catalog user.
    add();
    const user = entitiesIn(path).find(e => e.kind === 'User');
    expect(user.spec.profile.email).toBe('ada@teamomf.test');
    expect(user.spec.profile.displayName).toBe('Ada Lovelace');
  });

  it('records group membership so ownership claims resolve', () => {
    add();
    const user = entitiesIn(path).find(e => e.kind === 'User');
    expect(user.spec.memberOf).toEqual(['platform-engineering']);
  });

  it('adds the GitHub annotation only when supplied', () => {
    add({ githubLogin: 'adalovelace' });
    const withLogin = entitiesIn(path).find(e => e.kind === 'User');
    expect(withLogin.metadata.annotations['github.com/user-login']).toBe(
      'adalovelace',
    );
  });

  it('omits annotations entirely when no GitHub login is given', () => {
    add();
    const user = entitiesIn(path).find(e => e.kind === 'User');
    expect(user.metadata.annotations).toBeUndefined();
  });

  it('updates an existing user instead of duplicating them', () => {
    add();
    const second = add({ displayName: 'Ada L' });
    expect(second.created).toBe(false);

    const users = entitiesIn(path).filter(e => e.kind === 'User');
    expect(users).toHaveLength(1);
    expect(users[0].spec.profile.displayName).toBe('Ada L');
  });

  it('preserves extra group memberships added by hand', () => {
    add();
    const doc = readFileSync(path, 'utf8').replace(
      '    - platform-engineering',
      '    - platform-engineering\n    - incident-response',
    );
    writeFileSync(path, doc);

    add();
    const user = entitiesIn(path).find(e => e.kind === 'User');
    expect(user.spec.memberOf).toEqual(
      expect.arrayContaining(['platform-engineering', 'incident-response']),
    );
  });

  it('reuses an existing Group rather than adding a duplicate', () => {
    add();
    add({ username: 'grace', email: 'grace@teamomf.test' });
    const groups = entitiesIn(path).filter(e => e.kind === 'Group');
    expect(groups).toHaveLength(1);
    expect(entitiesIn(path).filter(e => e.kind === 'User')).toHaveLength(2);
  });

  it('creates a second Group for a different team', () => {
    add();
    add({
      username: 'grace',
      email: 'grace@teamomf.test',
      teamName: 'Finance',
    });
    const groups = entitiesIn(path)
      .filter(e => e.kind === 'Group')
      .map(g => g.metadata.name)
      .sort();
    expect(groups).toEqual(['finance', 'platform-engineering']);
  });
});

describe('removeOrgUser', () => {
  it('removes a user and reports whether anything changed', () => {
    const path = join(
      mkdtempSync(join(tmpdir(), 'teamomf-org-')),
      'teamomf-org.yaml',
    );
    upsertOrgEntities({
      path,
      username: 'ada',
      email: 'ada@teamomf.test',
      displayName: 'Ada Lovelace',
      teamName: 'Platform Engineering',
    });

    expect(removeOrgUser(path, 'ada')).toBe(true);
    expect(entitiesIn(path).filter(e => e.kind === 'User')).toHaveLength(0);
    expect(removeOrgUser(path, 'ada')).toBe(false);
  });
});
