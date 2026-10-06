import useAsync from 'react-use/esm/useAsync';
import { Box, Chip, Typography, makeStyles } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import BlockIcon from '@material-ui/icons/Block';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { catalogApiRef, entityRouteRef } from '@backstage/plugin-catalog-react';
import { permissionApiRef } from '@backstage/plugin-permission-react';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import type { Permission } from '@backstage/plugin-permission-common';
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import {
  taskCreatePermission,
  templateManagementPermission,
  templateParameterReadPermission,
} from '@backstage/plugin-scaffolder-common/alpha';
import {
  catalogEntityCreatePermission,
  catalogEntityReadPermission,
  catalogEntityRefreshPermission,
  catalogLocationCreatePermission,
} from '@backstage/plugin-catalog-common/alpha';
import { useIdentity } from '../hooks/useIdentity';

/**
 * One representative permission per TEAMOMF capability.
 *
 * This mirrors `permissions/capabilities.ts` in the teamomf-credentials
 * backend, which cannot be imported here because it is a backend package. The
 * mirror is safe: every row is decided by the real permission API at render
 * time, so a drifted label can never produce a wrong ALLOW/DENY.
 *
 * IMPORTANT: a *resource* permission must carry a `resourceRef`. The permission
 * backend rejects the ENTIRE batch with HTTP 400 -- "Resource permissions
 * require a resourceRef to be set" -- if any item omits one, which would make
 * every row fail identically for every user. Basic permissions must NOT carry
 * one. `taskCreatePermission` is deliberately used for "create a service"
 * because it is basic, and it is the same permission the scaffolder UI checks.
 */
type Probe = {
  capability: string;
  label: string;
  permission: Permission;
  resourceRef?: string;
};

type Decision = Probe & { allowed: boolean };

const useStyles = makeStyles(theme => ({
  section: {
    marginBottom: theme.spacing(2),
  },
  label: {
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.68rem',
    marginBottom: theme.spacing(0.75),
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.75),
  },
  personaChip: {
    fontWeight: 600,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
  allowIcon: {
    fontSize: 17,
    color: theme.palette.success.main,
    flexShrink: 0,
  },
  denyIcon: {
    fontSize: 17,
    color: theme.palette.text.disabled,
    flexShrink: 0,
  },
  denied: {
    color: theme.palette.text.secondary,
  },
  verdict: {
    marginLeft: 'auto',
    fontSize: '0.68rem',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  allowText: { color: theme.palette.success.main },
  denyText: { color: theme.palette.text.disabled },
}));

/**
 * "Your role / access" -- the signed-in person's persona and what it permits.
 *
 * Both halves are real. The persona chips are the user's catalog Group
 * memberships, taken from `ownershipEntityRefs` on the Backstage identity,
 * which the sign-in resolver built from `spec.memberOf` in the catalog. The
 * verdicts come from the permission API, i.e. the same TeamomfPermissionPolicy
 * that guards the actual endpoints -- this card cannot show ALLOW for
 * something the backend would refuse.
 */
export function Access() {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const permissionApi = useApi(permissionApiRef);
  const entityRoute = useRouteRef(entityRouteRef);

  const { value: identity, loading, error } = useIdentity();

  // Group titles come from the catalog so the card shows "Tech Leads" rather
  // than "tech-leads", without hardcoding any names in the frontend.
  const groups = useAsync(async () => {
    if (!identity || identity.groupRefs.length === 0) {
      return [];
    }
    const { items } = await catalogApi.getEntitiesByRefs({
      entityRefs: identity.groupRefs,
      fields: ['kind', 'metadata.name', 'metadata.namespace', 'metadata.title'],
    });
    return identity.groupRefs.map((ref, index) => ({
      ref,
      title: items[index]?.metadata?.title ?? parseEntityRef(ref).name,
    }));
  }, [catalogApi, identity]);

  const decisions = useAsync(async (): Promise<Decision[] | undefined> => {
    if (!identity) {
      return undefined;
    }

    // A real Template to probe "can you open a software template" against.
    // Resolved from the catalog rather than hardcoded, so the probe stays
    // meaningful if templates are renamed.
    const { items: templates } = await catalogApi.getEntities({
      filter: { kind: 'Template' },
      fields: ['kind', 'metadata.name', 'metadata.namespace'],
      limit: 1,
    });
    const templateRef = templates[0]
      ? stringifyEntityRef(templates[0])
      : undefined;
    // The signed-in user's own entity always exists, so it is a safe and
    // honest resourceRef for the catalog-entity permissions.
    const selfRef = identity.userEntityRef;

    const probes: Probe[] = [
      {
        capability: 'ungated',
        label: 'View the software catalog',
        permission: catalogEntityReadPermission,
        resourceRef: selfRef,
      },
    ];
    if (templateRef) {
      probes.push({
        capability: 'template.read',
        label: 'Open a software template',
        permission: templateParameterReadPermission,
        resourceRef: templateRef,
      });
    }
    probes.push(
      {
        capability: 'scaffolder.execute',
        label: 'Create a service from a template',
        permission: taskCreatePermission,
      },
      {
        capability: 'template.manage',
        label: 'Manage software templates',
        permission: templateManagementPermission,
      },
      {
        capability: 'catalog.entity.refresh',
        label: 'Refresh a catalog entity',
        permission: catalogEntityRefreshPermission,
        resourceRef: selfRef,
      },
      {
        capability: 'catalog.entity.write',
        label: 'Create or delete catalog entities',
        permission: catalogEntityCreatePermission,
      },
      {
        capability: 'catalog.location.manage',
        label: 'Register or remove catalog locations',
        permission: catalogLocationCreatePermission,
      },
    );

    // Deliberately NOT wrapped in a catch. Silently rendering a failed probe
    // as DENY is what previously made every persona look identical.
    const results = await Promise.all(
      probes.map(probe =>
        permissionApi.authorize(
          probe.resourceRef
            ? { permission: probe.permission, resourceRef: probe.resourceRef }
            : { permission: probe.permission },
        ),
      ),
    );

    return probes.map((probe, index) => ({
      ...probe,
      allowed: results[index].result === AuthorizeResult.ALLOW,
    }));
  }, [permissionApi, catalogApi, identity]);

  if (loading) {
    return <Progress />;
  }
  if (error) {
    return <ResponseErrorPanel error={error} />;
  }
  // A failed authorize batch is shown, not swallowed: rendering it as DENY
  // would make every persona look identical.
  if (decisions.error) {
    return <ResponseErrorPanel error={decisions.error} />;
  }

  const allowedCount = decisions.value?.filter(d => d.allowed).length ?? 0;

  return (
    <Box>
      <div className={classes.section}>
        <Typography className={classes.label}>Signed in as</Typography>
        <Typography variant="body2">
          {identity?.displayName ?? identity?.userEntityRef}
          {identity?.email ? ` · ${identity.email}` : ''}
        </Typography>
      </div>

      <div className={classes.section}>
        <Typography className={classes.label}>
          Persona {groups.value && groups.value.length > 1 ? '(groups)' : '(group)'}
        </Typography>
        {groups.loading && <Progress />}
        {!groups.loading && (!groups.value || groups.value.length === 0) && (
          <Typography variant="body2" color="textSecondary">
            You are not a member of any group, so the portal is read-only for
            you. Membership is set in <code>catalog/teamomf-org.yaml</code>.
          </Typography>
        )}
        <div className={classes.chips}>
          {groups.value?.map(group => {
            const { kind, namespace, name } = parseEntityRef(group.ref);
            return (
              <Link
                key={group.ref}
                to={entityRoute({ kind: kind.toLowerCase(), namespace, name })}
              >
                <Chip
                  size="small"
                  color="primary"
                  label={group.title}
                  className={classes.personaChip}
                  clickable
                />
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <Typography className={classes.label}>
          What you can do
          {decisions.value
            ? ` · ${allowedCount} of ${decisions.value.length}`
            : ''}
        </Typography>
        {decisions.loading && <Progress />}
        {decisions.value?.map(decision => (
          <div key={decision.capability} className={classes.row}>
            {decision.allowed ? (
              <CheckCircleIcon className={classes.allowIcon} />
            ) : (
              <BlockIcon className={classes.denyIcon} />
            )}
            <Typography
              variant="body2"
              className={decision.allowed ? undefined : classes.denied}
            >
              {decision.label}
            </Typography>
            <span
              className={`${classes.verdict} ${
                decision.allowed ? classes.allowText : classes.denyText
              }`}
            >
              {decision.allowed ? 'ALLOW' : 'DENY'}
            </span>
          </div>
        ))}
      </div>
    </Box>
  );
}
