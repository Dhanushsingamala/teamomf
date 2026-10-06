'use strict';

import type { Config } from '@backstage/config';
import {
  ALL_CAPABILITIES,
  isCapability,
  type TeamomfCapability,
} from './capabilities';

/** A TEAMOMF persona: one catalog Group plus the capabilities it grants. */
export type TeamomfPersona = {
  /** Normalised entity ref, e.g. `group:default/developers`. */
  groupRef: string;
  /** Human readable name shown in the portal and the CLI. */
  title: string;
  capabilities: Set<TeamomfCapability>;
};

/** Persona definitions indexed by lower-cased group ref. */
export type PersonaModel = Map<string, TeamomfPersona>;

const CONFIG_KEY = 'teamomf.permissions.personas';

/**
 * Normalises a group reference.
 *
 * `developers` and `group:default/developers` both mean the same thing; the
 * short form is accepted because it is what people type in app-config.yaml.
 */
export function normaliseGroupRef(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('A persona group reference cannot be empty');
  }
  return trimmed.includes(':') ? trimmed : `group:default/${trimmed}`;
}

/**
 * The persona model used when `teamomf.permissions` is absent from config.
 *
 * This reproduces the behaviour that existed before personas were made
 * configurable: Developers could scaffold and write to the catalog, everyone
 * else was read-only. Keeping it means a missing or partial config degrades to
 * something sane rather than locking the portal down.
 */
export function defaultPersonaModel(): PersonaModel {
  return new Map([
    [
      'group:default/developers',
      {
        groupRef: 'group:default/developers',
        title: 'Developer',
        capabilities: new Set(ALL_CAPABILITIES),
      },
    ],
  ]);
}

/**
 * Reads the persona model from app-config.yaml.
 *
 * Unknown capability names throw rather than being ignored. A typo in a
 * persona definition is a security-relevant mistake -- silently granting less
 * than intended would be discovered only when someone is wrongly denied, and
 * silently granting more would never be discovered at all.
 */
export function readPersonaModel(config: Config): PersonaModel {
  const configured = config.getOptionalConfigArray(CONFIG_KEY);
  if (!configured || configured.length === 0) {
    return defaultPersonaModel();
  }

  const model: PersonaModel = new Map();

  for (const entry of configured) {
    const groupRef = normaliseGroupRef(entry.getString('group'));
    if (model.has(groupRef)) {
      throw new Error(
        `Duplicate TEAMOMF persona for "${groupRef}" in ${CONFIG_KEY}`,
      );
    }

    const raw = entry.getStringArray('capabilities');
    const capabilities = new Set<TeamomfCapability>();

    for (const item of raw) {
      const value = item.trim();
      if (value === '*') {
        ALL_CAPABILITIES.forEach(c => capabilities.add(c));
        continue;
      }
      if (!isCapability(value)) {
        throw new Error(
          `Unknown TEAMOMF capability "${value}" for persona "${groupRef}". ` +
            `Valid capabilities are: ${ALL_CAPABILITIES.join(', ')}, or "*".`,
        );
      }
      capabilities.add(value);
    }

    model.set(groupRef, {
      groupRef,
      title: entry.getOptionalString('title') ?? groupRef,
      capabilities,
    });
  }

  return model;
}

/**
 * Resolves which personas an identity holds.
 *
 * Membership is read only from `ownershipEntityRefs`, which the sign-in
 * resolver derived from the user's `spec.memberOf` in the catalog. The request
 * never gets a say, so the only way to hold a persona is to genuinely be in
 * that Group. Comparison is case-insensitive because entity refs are.
 */
export function personasOf(
  model: PersonaModel,
  ownershipEntityRefs: string[],
): TeamomfPersona[] {
  const owned = new Set(
    ownershipEntityRefs.map(ref => ref.trim().toLowerCase()),
  );
  return [...model.values()].filter(persona => owned.has(persona.groupRef));
}

/** The union of every capability granted by the personas an identity holds. */
export function capabilitiesOf(
  personas: TeamomfPersona[],
): Set<TeamomfCapability> {
  const granted = new Set<TeamomfCapability>();
  for (const persona of personas) {
    persona.capabilities.forEach(c => granted.add(c));
  }
  return granted;
}
