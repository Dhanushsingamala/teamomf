import { catalogEntityReadPermission } from '@backstage/plugin-catalog-common/alpha';
import {
  ALL_CAPABILITIES,
  CAPABILITIES,
  CAPABILITY_LABELS,
} from '../permissions/capabilities';
import { capabilitiesOf, personasOf, type PersonaModel } from '../permissions/personas';
import { ask, askHidden } from './prompt';

/**
 * The capabilities worth reporting, in the order a person would care about.
 *
 * Each probe is a real Backstage permission evaluated by the real policy over
 * the network -- nothing here is simulated locally. One representative
 * permission per capability is enough, because the policy resolves every
 * permission in a capability to the same decision.
 */
const PROBES = [
  {
    capability: undefined,
    label: 'View the software catalog',
    permission: catalogEntityReadPermission,
  },
  ...ALL_CAPABILITIES.map(capability => ({
    capability,
    label: CAPABILITY_LABELS[capability],
    permission: CAPABILITIES[capability][0],
  })),
];

/** Extracts a cookie value from one or more Set-Cookie headers. */
function readSetCookie(headers: Headers, name: string): string | undefined {
  const raw =
    typeof (headers as { getSetCookie?: () => string[] }).getSetCookie ===
    'function'
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [headers.get('set-cookie') ?? ''];

  for (const line of raw) {
    for (const part of line.split(/,(?=[^;]+?=)/)) {
      const [pair] = part.split(';');
      const [key, ...rest] = pair.split('=');
      if (key.trim() === name) {
        return rest.join('=').trim();
      }
    }
  }
  return undefined;
}

/**
 * Verifies a real persona end to end.
 *
 * Signs in with real credentials, exchanges the session for a real Backstage
 * identity token, then asks the running permission backend to decide each
 * capability. This exercises the entire chain -- credential store, sign-in
 * resolver, catalog group membership, identity claims, permission policy --
 * rather than asserting anything in-process.
 */
export async function checkPersona(options: {
  backendBaseUrl: string;
  personaModel: PersonaModel;
}): Promise<void> {
  const { backendBaseUrl, personaModel } = options;

  process.stdout.write(
    `\nVerify a TEAMOMF persona against ${backendBaseUrl}\n` +
      'Signs in as a real user and reports what the permission policy allows.\n\n',
  );

  const username = await ask('Username or email: ');
  if (!username) {
    throw new Error('A username is required.');
  }
  const password = await askHidden('Password (hidden): ');

  // 1. Credential login -> session cookie.
  const loginRes = await fetch(
    `${backendBaseUrl}/api/teamomf-credentials/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    },
  );

  if (!loginRes.ok) {
    const body = (await loginRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      `Sign-in failed (${loginRes.status}): ${body.error ?? 'unknown error'}`,
    );
  }

  const sessionCookie = readSetCookie(loginRes.headers, 'teamomf-session');
  if (!sessionCookie) {
    throw new Error(
      'Sign-in succeeded but no teamomf-session cookie was returned.',
    );
  }

  // 2. Exchange the session for a Backstage identity token.
  const refreshRes = await fetch(`${backendBaseUrl}/api/auth/teamomf/refresh`, {
    headers: {
      Cookie: `teamomf-session=${sessionCookie}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!refreshRes.ok) {
    throw new Error(
      `Could not issue an identity (${refreshRes.status}). ` +
        'Is there a catalog User entity whose spec.profile.email matches this login?',
    );
  }

  const session = (await refreshRes.json()) as {
    profile?: { displayName?: string; email?: string };
    backstageIdentity: {
      token: string;
      identity: { userEntityRef: string; ownershipEntityRefs: string[] };
    };
  };

  const { token, identity } = session.backstageIdentity;
  const personas = personasOf(personaModel, identity.ownershipEntityRefs);
  const expected = capabilitiesOf(personas);

  process.stdout.write(
    `\nIdentity\n` +
      `  user           ${identity.userEntityRef}\n` +
      `  display name   ${session.profile?.displayName ?? '-'}\n` +
      `  email          ${session.profile?.email ?? '-'}\n` +
      `  ownership refs ${identity.ownershipEntityRefs.join(', ')}\n` +
      `  TEAMOMF persona${personas.length === 1 ? ' ' : 's'} ${
        personas.length > 0
          ? personas.map(p => p.title).join(', ')
          : 'none (read-only)'
      }\n\n`,
  );

  // 3. Ask the real permission backend for a decision on each capability.
  const authorizeRes = await fetch(
    `${backendBaseUrl}/api/permission/authorize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: PROBES.map((probe, index) => ({
          id: String(index),
          permission: probe.permission,
        })),
      }),
    },
  );

  if (!authorizeRes.ok) {
    throw new Error(
      `Permission check failed (${authorizeRes.status}): ${await authorizeRes
        .text()
        .catch(() => '')}`,
    );
  }

  const decisions = (await authorizeRes.json()) as {
    items: { id: string; result: string }[];
  };
  const byId = new Map(decisions.items.map(i => [i.id, i.result]));

  process.stdout.write('Capabilities (decided by the TEAMOMF policy)\n');
  let denied = 0;
  let mismatched = 0;

  PROBES.forEach((probe, index) => {
    const result = byId.get(String(index)) ?? 'UNKNOWN';
    if (result !== 'ALLOW') {
      denied += 1;
    }
    // The live decision should agree with what the configured persona model
    // predicts. A disagreement means the running backend is on stale config.
    const predicted = probe.capability ? expected.has(probe.capability) : true;
    const agrees = predicted === (result === 'ALLOW');
    if (!agrees) {
      mismatched += 1;
    }
    process.stdout.write(
      `  ${result.padEnd(6)}  ${probe.label.padEnd(38)} ${
        probe.capability ?? 'ungated'
      }${agrees ? '' : '   <-- does not match app-config.yaml'}\n`,
    );
  });

  process.stdout.write(
    `\n${PROBES.length - denied} allowed, ${denied} denied.\n`,
  );

  if (mismatched > 0) {
    process.stdout.write(
      `\nWARNING: ${mismatched} decision(s) disagree with teamomf.permissions ` +
        'in app-config.yaml. Restart the backend to pick up config changes.\n',
    );
  }
  process.stdout.write('\n');
}
