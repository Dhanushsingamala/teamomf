'use strict';

import type {
  LoggerService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import {
  AuthorizeResult,
  type PolicyDecision,
} from '@backstage/plugin-permission-common';
import type {
  PermissionPolicy,
  PolicyQuery,
  PolicyQueryUser,
} from '@backstage/plugin-permission-node';
import { capabilityFor } from './capabilities';
import {
  capabilitiesOf,
  personasOf,
  type PersonaModel,
} from './personas';

/**
 * The TEAMOMF permission policy.
 *
 * Authorization is derived entirely from real catalog Group membership. The
 * identity token issued at sign-in carries `ownershipEntityRefs`, which the
 * sign-in resolver built from the user's `spec.memberOf` in the catalog -- so
 * a capability can only be obtained by genuinely being in that group.
 *
 * The persona -> capability mapping lives in `teamomf.permissions.personas` in
 * app-config.yaml rather than in this file, so adding a persona or changing
 * what one can do is a configuration change, not a code change.
 *
 * Design intent, kept deliberately small:
 *
 *  - Reading the catalog, APIs, TechDocs and search is open to every
 *    signed-in user. A developer portal that hides the org chart from
 *    Finance is not useful, and none of that data is sensitive.
 *  - Everything that creates, executes or destroys is gated by a capability.
 *
 * Anything not gated by a capability is allowed, so installing a new plugin
 * cannot silently lock everyone out. Denials are explicit and enumerated in
 * `capabilities.ts`.
 */
export class TeamomfPermissionPolicy implements PermissionPolicy {
  constructor(
    private readonly logger: LoggerService,
    private readonly userInfo: UserInfoService,
    private readonly personaModel: PersonaModel,
  ) {}

  async handle(
    request: PolicyQuery,
    user?: PolicyQueryUser,
  ): Promise<PolicyDecision> {
    const required = capabilityFor(request.permission.name);

    // Not a gated permission: catalog read, task read, TechDocs, search,
    // settings and everything a future plugin might add.
    if (!required) {
      return { result: AuthorizeResult.ALLOW };
    }

    // Resolved through the userInfo service rather than the deprecated
    // `user.info` field. No identity at all means an unauthenticated or
    // service request reached the policy, so gated paths are denied rather
    // than guessed at.
    let userRef: string | undefined;
    let ownershipRefs: string[] = [];
    if (user) {
      const info = await this.userInfo.getUserInfo(user.credentials);
      userRef = info.userEntityRef;
      ownershipRefs = info.ownershipEntityRefs;
    }

    const personas = personasOf(this.personaModel, ownershipRefs);
    const granted = capabilitiesOf(personas);

    if (granted.has(required)) {
      return { result: AuthorizeResult.ALLOW };
    }

    this.logger.info(
      `Denied ${request.permission.name} for ${userRef ?? 'anonymous'}: ` +
        `capability "${required}" is not granted by persona(s) [${
          personas.map(p => p.title).join(', ') || 'none'
        }]`,
    );
    return { result: AuthorizeResult.DENY };
  }
}
