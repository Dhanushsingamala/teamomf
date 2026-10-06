'use strict';

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { TeamomfPermissionPolicy } from './TeamomfPermissionPolicy';
import { readPersonaModel } from './personas';

/**
 * Installs the TEAMOMF permission policy.
 *
 * Replaces `plugin-permission-backend-module-allow-all-policy`, which allowed
 * every action for every signed-in user. The persona model is read once at
 * startup from `teamomf.permissions.personas`; an invalid capability name
 * fails the backend boot rather than quietly granting the wrong thing.
 */
export const permissionModuleTeamomfPolicy = createBackendModule({
  pluginId: 'permission',
  moduleId: 'teamomf-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        userInfo: coreServices.userInfo,
      },
      async init({ policy, logger, config, userInfo }) {
        const personaModel = readPersonaModel(config);
        policy.setPolicy(
          new TeamomfPermissionPolicy(logger, userInfo, personaModel),
        );
        logger.info(
          `TEAMOMF permission policy installed with ${personaModel.size} persona(s): ` +
            [...personaModel.values()]
              .map(p => `${p.title} (${p.capabilities.size})`)
              .join(', '),
        );
      },
    });
  },
});
