import { ConfigReader } from '@backstage/config';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  actionExecutePermission,
  taskCancelPermission,
  taskCreatePermission,
  taskReadPermission,
  templateManagementPermission,
  templateParameterReadPermission,
  templateStepReadPermission,
} from '@backstage/plugin-scaffolder-common/alpha';
import {
  catalogEntityCreatePermission,
  catalogEntityDeletePermission,
  catalogEntityReadPermission,
  catalogEntityRefreshPermission,
  catalogLocationCreatePermission,
  catalogLocationDeletePermission,
} from '@backstage/plugin-catalog-common/alpha';
import { TeamomfPermissionPolicy } from './TeamomfPermissionPolicy';
import {
  capabilitiesOf,
  defaultPersonaModel,
  normaliseGroupRef,
  personasOf,
  readPersonaModel,
} from './personas';
import { ALL_CAPABILITIES, capabilityFor } from './capabilities';

const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => logger,
} as any;

/** Stands in for the userInfo service, keyed off the fake credentials. */
function userInfoFor(
  ownershipEntityRefs: string[],
  userEntityRef = 'user:default/someone',
) {
  return {
    getUserInfo: async () => ({ userEntityRef, ownershipEntityRefs }),
  } as any;
}

/**
 * The persona model exactly as app-config.yaml declares it, so these tests
 * fail if the shipped configuration and the intended behaviour diverge.
 */
const CONFIG = new ConfigReader({
  teamomf: {
    permissions: {
      personas: [
        { group: 'developers', title: 'Developer', capabilities: ['*'] },
        { group: 'tech-leads', title: 'Tech Lead', capabilities: ['*'] },
        {
          group: 'engineering-managers',
          title: 'Engineering Manager',
          capabilities: ['template.read', 'catalog.entity.refresh'],
        },
        { group: 'platform', title: 'Platform / DevOps', capabilities: ['*'] },
        { group: 'platform-admins', title: 'Admin', capabilities: ['*'] },
      ],
    },
  },
});

const MODEL = readPersonaModel(CONFIG);

function policyFor(refs: string[], model = MODEL) {
  return new TeamomfPermissionPolicy(logger, userInfoFor(refs), model);
}

const asUser = { credentials: {} as any, info: {} as any };

async function decide(refs: string[], permission: any, user: any = asUser) {
  const policy = policyFor(refs);
  const decision = await policy.handle({ permission } as any, user);
  return decision.result;
}

const groups = (...names: string[]) => names.map(n => `group:default/${n}`);

/** Every permission the capability model gates. */
const GATED = [
  templateParameterReadPermission,
  templateStepReadPermission,
  taskCreatePermission,
  actionExecutePermission,
  taskCancelPermission,
  templateManagementPermission,
  catalogEntityRefreshPermission,
  catalogEntityCreatePermission,
  catalogEntityDeletePermission,
  catalogLocationCreatePermission,
  catalogLocationDeletePermission,
];

describe('capability model', () => {
  it('gates exactly the intended permissions', () => {
    for (const permission of GATED) {
      expect(capabilityFor(permission.name)).toBeDefined();
    }
  });

  it('leaves read-only permissions ungated', () => {
    for (const permission of [
      catalogEntityReadPermission,
      taskReadPermission,
    ]) {
      expect(capabilityFor(permission.name)).toBeUndefined();
    }
  });
});

describe('normaliseGroupRef', () => {
  it('expands a bare group name', () => {
    expect(normaliseGroupRef('developers')).toBe('group:default/developers');
  });

  it('passes a full ref through, lower-cased', () => {
    expect(normaliseGroupRef('Group:Default/Tech-Leads')).toBe(
      'group:default/tech-leads',
    );
  });

  it('rejects an empty ref', () => {
    expect(() => normaliseGroupRef('  ')).toThrow();
  });
});

describe('readPersonaModel', () => {
  it('expands "*" to every capability', () => {
    expect(MODEL.get('group:default/developers')!.capabilities.size).toBe(
      ALL_CAPABILITIES.length,
    );
  });

  it('reads an explicit capability list verbatim', () => {
    const em = MODEL.get('group:default/engineering-managers')!;
    expect([...em.capabilities].sort()).toEqual([
      'catalog.entity.refresh',
      'template.read',
    ]);
  });

  it('falls back to the Developer-only model when unconfigured', () => {
    const model = readPersonaModel(new ConfigReader({}));
    expect([...model.keys()]).toEqual(['group:default/developers']);
    expect(model.get('group:default/developers')!.capabilities.size).toBe(
      ALL_CAPABILITIES.length,
    );
  });

  it('rejects an unknown capability rather than ignoring it', () => {
    const bad = new ConfigReader({
      teamomf: {
        permissions: {
          personas: [{ group: 'developers', capabilities: ['scaffold.all'] }],
        },
      },
    });
    expect(() => readPersonaModel(bad)).toThrow(/Unknown TEAMOMF capability/);
  });

  it('rejects a duplicate persona', () => {
    const dup = new ConfigReader({
      teamomf: {
        permissions: {
          personas: [
            { group: 'developers', capabilities: [] },
            { group: 'group:default/developers', capabilities: [] },
          ],
        },
      },
    });
    expect(() => readPersonaModel(dup)).toThrow(/Duplicate TEAMOMF persona/);
  });
});

describe('personasOf', () => {
  it('matches real group refs case-insensitively', () => {
    const found = personasOf(MODEL, ['user:default/x', 'Group:Default/Platform']);
    expect(found.map(p => p.title)).toEqual(['Platform / DevOps']);
  });

  it('returns nothing for a group with no persona', () => {
    expect(personasOf(MODEL, groups('finance'))).toEqual([]);
  });

  it('unions capabilities across multiple personas', () => {
    const found = personasOf(MODEL, groups('engineering-managers', 'developers'));
    expect(capabilitiesOf(found).size).toBe(ALL_CAPABILITIES.length);
  });
});

describe('TeamomfPermissionPolicy', () => {
  // Behaviour that existed before personas were configurable, asserted here so
  // the migration cannot silently change what a Developer may do.
  describe('Developer (unchanged behaviour)', () => {
    it.each(GATED.map(p => [p.name, p] as const))('allows %s', async (_n, p) => {
      await expect(decide(groups('developers'), p)).resolves.toBe(
        AuthorizeResult.ALLOW,
      );
    });
  });

  describe.each([
    ['tech-leads', AuthorizeResult.ALLOW],
    ['platform', AuthorizeResult.ALLOW],
    ['platform-admins', AuthorizeResult.ALLOW],
  ] as const)('%s', (group, expected) => {
    it(`resolves scaffolder execution to ${expected}`, async () => {
      await expect(decide(groups(group), taskCreatePermission)).resolves.toBe(
        expected,
      );
    });
  });

  describe('Engineering Manager', () => {
    it('may open a template', async () => {
      await expect(
        decide(groups('engineering-managers'), templateParameterReadPermission),
      ).resolves.toBe(AuthorizeResult.ALLOW);
    });

    it('may refresh a catalog entity', async () => {
      await expect(
        decide(groups('engineering-managers'), catalogEntityRefreshPermission),
      ).resolves.toBe(AuthorizeResult.ALLOW);
    });

    it('may NOT create a service from a template', async () => {
      await expect(
        decide(groups('engineering-managers'), taskCreatePermission),
      ).resolves.toBe(AuthorizeResult.DENY);
    });

    it('may NOT register a catalog location', async () => {
      await expect(
        decide(groups('engineering-managers'), catalogLocationCreatePermission),
      ).resolves.toBe(AuthorizeResult.DENY);
    });
  });

  describe('a group with no persona', () => {
    it.each(['finance', 'hr', 'some-other-team'])(
      'denies %s the ability to open a template',
      async group => {
        await expect(
          decide(groups(group), templateParameterReadPermission),
        ).resolves.toBe(AuthorizeResult.DENY);
      },
    );

    it('still allows reading the catalog', async () => {
      for (const group of ['finance', 'hr', 'engineering-managers']) {
        await expect(
          decide(groups(group), catalogEntityReadPermission),
        ).resolves.toBe(AuthorizeResult.ALLOW);
      }
    });
  });

  it('denies gated permissions when there is no identity at all', async () => {
    await expect(
      decide([], taskCreatePermission, undefined),
    ).resolves.toBe(AuthorizeResult.DENY);
  });

  it('allows ungated permissions without consulting the identity', async () => {
    const policy = new TeamomfPermissionPolicy(
      logger,
      {
        getUserInfo: () => {
          throw new Error('userInfo must not be called for ungated reads');
        },
      } as any,
      MODEL,
    );
    await expect(
      policy.handle({ permission: catalogEntityReadPermission } as any, asUser),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
  });

  it('falls back to Developer-only behaviour with no config', async () => {
    const model = defaultPersonaModel();
    await expect(
      policyFor(groups('developers'), model).handle(
        { permission: taskCreatePermission } as any,
        asUser,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policyFor(groups('tech-leads'), model).handle(
        { permission: taskCreatePermission } as any,
        asUser,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });
});
