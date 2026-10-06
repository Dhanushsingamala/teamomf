'use strict';

import type { Permission } from '@backstage/plugin-permission-common';
import {
  actionExecutePermission,
  taskCancelPermission,
  taskCreatePermission,
  templateManagementPermission,
  templateParameterReadPermission,
  templateStepReadPermission,
} from '@backstage/plugin-scaffolder-common/alpha';
import {
  catalogEntityCreatePermission,
  catalogEntityDeletePermission,
  catalogEntityRefreshPermission,
  catalogLocationCreatePermission,
  catalogLocationDeletePermission,
} from '@backstage/plugin-catalog-common/alpha';

/**
 * The TEAMOMF capability model.
 *
 * A *capability* is a named bundle of real Backstage permissions. Personas are
 * granted capabilities, never individual permissions, so that the persona
 * definitions in app-config.yaml stay readable and cannot drift out of sync
 * with the permission names the plugins actually publish.
 *
 * Only permissions listed here are gated. Anything absent -- catalog read,
 * location read, task read, entity validate, TechDocs, search, settings -- is
 * allowed for every signed-in user. That is deliberate: a developer portal
 * that hides the catalog from anyone is not useful, and it means installing a
 * new plugin can never silently lock everybody out.
 */
export const CAPABILITIES = {
  /** Open a software template and see its parameters and steps. */
  'template.read': [templateParameterReadPermission, templateStepReadPermission],

  /** Create a component from a template (the scaffolder wizard's Create). */
  'scaffolder.execute': [taskCreatePermission, actionExecutePermission],

  /** Cancel a scaffolder task that is already running. */
  'scaffolder.cancel': [taskCancelPermission],

  /** Administer templates themselves. */
  'template.manage': [templateManagementPermission],

  /** Force a catalog entity to refresh from its source. */
  'catalog.entity.refresh': [catalogEntityRefreshPermission],

  /** Create or delete catalog entities directly. */
  'catalog.entity.write': [
    catalogEntityCreatePermission,
    catalogEntityDeletePermission,
  ],

  /** Register or unregister catalog locations. */
  'catalog.location.manage': [
    catalogLocationCreatePermission,
    catalogLocationDeletePermission,
  ],
} satisfies Record<string, Permission[]>;

export type TeamomfCapability = keyof typeof CAPABILITIES;

export const ALL_CAPABILITIES = Object.keys(
  CAPABILITIES,
) as TeamomfCapability[];

/**
 * Human readable labels, so the CLI, the backend logs and the portal all
 * describe a capability with the same words.
 */
export const CAPABILITY_LABELS: Record<TeamomfCapability, string> = {
  'template.read': 'Open a software template',
  'scaffolder.execute': 'Create a service from a template',
  'scaffolder.cancel': 'Cancel a running scaffolder task',
  'template.manage': 'Manage software templates',
  'catalog.entity.refresh': 'Refresh a catalog entity',
  'catalog.entity.write': 'Create or delete catalog entities',
  'catalog.location.manage': 'Register or remove catalog locations',
};

/**
 * Reverse index: permission name -> the capability that gates it.
 *
 * Built once at module load so the policy does a single map lookup per
 * authorization request rather than scanning every capability.
 */
const GATED_BY = new Map<string, TeamomfCapability>(
  ALL_CAPABILITIES.flatMap(capability =>
    CAPABILITIES[capability].map(
      permission => [permission.name, capability] as const,
    ),
  ),
);

/**
 * Returns the capability required for a permission, or undefined when the
 * permission is not gated at all (and is therefore allowed).
 */
export function capabilityFor(
  permissionName: string,
): TeamomfCapability | undefined {
  return GATED_BY.get(permissionName);
}

export function isCapability(value: string): value is TeamomfCapability {
  return Object.hasOwn(CAPABILITIES, value);
}
