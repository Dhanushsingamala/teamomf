import { Box, Grid, Typography, makeStyles } from '@material-ui/core';
import { Link, Progress } from '@backstage/core-components';
import { configApiRef, useApi, useRouteRef } from '@backstage/core-plugin-api';
import { entityRouteRef } from '@backstage/plugin-catalog-react';
import { parseEntityRef } from '@backstage/catalog-model';
import { useIdentity } from '../hooks/useIdentity';
import { useCatalogEntities } from '../hooks/useCatalogEntities';

const useStyles = makeStyles(theme => ({
  greeting: {
    fontWeight: 600,
  },
  sub: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  stats: {
    marginTop: theme.spacing(2.5),
  },
  statValue: {
    fontWeight: 700,
    lineHeight: 1.1,
  },
  statLabel: {
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: '0.68rem',
  },
  teams: {
    marginTop: theme.spacing(2),
  },
}));

function Stat(props: { value: number; label: string }) {
  const classes = useStyles();
  return (
    <Grid item xs={6} sm={3}>
      <Typography variant="h4" className={classes.statValue}>
        {props.value}
      </Typography>
      <Typography className={classes.statLabel}>{props.label}</Typography>
    </Grid>
  );
}

/**
 * Greets the signed-in person and summarises the catalog.
 *
 * Every number here is a live count from the catalog API -- if the catalog is
 * empty the counters read zero rather than showing invented figures.
 */
export function Welcome() {
  const classes = useStyles();
  const configApi = useApi(configApiRef);
  const entityRoute = useRouteRef(entityRouteRef);
  const orgName = configApi.getOptionalString('organization.name') ?? 'TEAMOMF';

  const { value: identity, loading: identityLoading } = useIdentity();

  const components = useCatalogEntities({
    filter: { kind: 'Component' },
    limit: 0,
  });
  const apis = useCatalogEntities({ filter: { kind: 'API' }, limit: 0 });
  const systems = useCatalogEntities({ filter: { kind: 'System' }, limit: 0 });
  const owned = useCatalogEntities({
    filter: identity
      ? { 'relations.ownedBy': identity.ownershipEntityRefs }
      : undefined,
    enabled: Boolean(identity),
    limit: 0,
  });

  if (identityLoading) {
    return <Progress />;
  }

  const firstName = identity?.displayName?.split(' ')[0];

  return (
    <Box>
      <Typography variant="h5" className={classes.greeting}>
        {firstName ? `Welcome back, ${firstName}` : `Welcome to ${orgName}`}
      </Typography>
      <Typography variant="body2" className={classes.sub}>
        This is the {orgName} internal developer portal. Everything below is
        read live from the software catalog.
      </Typography>

      <Grid container spacing={2} className={classes.stats}>
        <Stat value={components.value?.total ?? 0} label="Components" />
        <Stat value={apis.value?.total ?? 0} label="APIs" />
        <Stat value={systems.value?.total ?? 0} label="Systems" />
        <Stat value={owned.value?.total ?? 0} label="Owned by you" />
      </Grid>

      {identity && identity.groupRefs.length > 0 && (
        <Typography variant="body2" className={classes.teams}>
          Your teams:{' '}
          {identity.groupRefs.map((ref, index) => {
            const { kind, namespace, name } = parseEntityRef(ref);
            return (
              <span key={ref}>
                {index > 0 && ', '}
                <Link
                  to={entityRoute({
                    kind: kind.toLowerCase(),
                    namespace,
                    name,
                  })}
                >
                  {name}
                </Link>
              </span>
            );
          })}
        </Typography>
      )}
    </Box>
  );
}
