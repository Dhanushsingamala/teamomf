import {
  List,
  ListItem,
  ListItemText,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { CATALOG_FILTER_EXISTS } from '@backstage/plugin-catalog-react';
import { EntityList, EmptyHint } from '../components/EntityList';
import { useCatalogEntities } from '../hooks/useCatalogEntities';
import { useIdentity } from '../hooks/useIdentity';

const GITHUB_SLUG_ANNOTATION = 'github.com/project-slug';
const TECHDOCS_ANNOTATION = 'backstage.io/techdocs-ref';

/** Components owned by the signed-in user or any of their teams. */
export function OwnedEntities() {
  const { value: identity, loading: identityLoading } = useIdentity();
  const { value, loading, error } = useCatalogEntities({
    filter: identity
      ? { 'relations.ownedBy': identity.ownershipEntityRefs }
      : undefined,
    enabled: Boolean(identity),
  });

  return (
    <EntityList
      entities={value?.entities ?? []}
      loading={identityLoading || loading}
      error={error}
      emptyMessage="Nothing is owned by you or your teams yet."
      emptyHint="Set spec.owner in a catalog-info.yaml to one of your groups."
    />
  );
}

/** Every registered Component, newest catalog entries first. */
export function Services() {
  const { value, loading, error } = useCatalogEntities({
    filter: { kind: 'Component' },
  });
  return (
    <EntityList
      entities={value?.entities ?? []}
      loading={loading}
      error={error}
      emptyMessage="No components registered."
      emptyHint="Register a repository containing a catalog-info.yaml."
    />
  );
}

/** Every registered API entity. */
export function Apis() {
  const { value, loading, error } = useCatalogEntities({
    filter: { kind: 'API' },
  });
  return (
    <EntityList
      entities={value?.entities ?? []}
      loading={loading}
      error={error}
      emptyMessage="No APIs registered."
      emptyHint="Add an API entity with an OpenAPI definition."
    />
  );
}

/** Entities that actually publish TechDocs. */
export function Documentation() {
  const { value, loading, error } = useCatalogEntities({
    filter: {
      [`metadata.annotations.${TECHDOCS_ANNOTATION}`]: CATALOG_FILTER_EXISTS,
    },
  });
  return (
    <EntityList
      entities={value?.entities ?? []}
      loading={loading}
      error={error}
      emptyMessage="No entity publishes TechDocs yet."
      emptyHint={`Add the ${TECHDOCS_ANNOTATION} annotation to a component.`}
    />
  );
}

/** Scaffolder templates available to this portal. */
export function Templates() {
  const { value, loading, error } = useCatalogEntities({
    filter: { kind: 'Template' },
  });
  return (
    <EntityList
      entities={value?.entities ?? []}
      loading={loading}
      error={error}
      emptyMessage="No software templates registered."
      emptyHint="Templates appear here once registered in the catalog."
    />
  );
}

const useRepoStyles = makeStyles(theme => ({
  item: {
    paddingLeft: 0,
    paddingRight: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
  slug: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
  },
}));

/**
 * Real source repositories, derived from the github.com/project-slug
 * annotation on catalog entities. Each link opens the actual repository.
 */
export function Repositories() {
  const classes = useRepoStyles();
  const { value, loading, error } = useCatalogEntities({
    filter: {
      [`metadata.annotations.${GITHUB_SLUG_ANNOTATION}`]: CATALOG_FILTER_EXISTS,
    },
    limit: 12,
  });

  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;

  const entities = value?.entities ?? [];
  if (entities.length === 0) {
    return (
      <EmptyHint
        message="No catalog entity points at a source repository."
        hint={`Add the ${GITHUB_SLUG_ANNOTATION} annotation to link one.`}
      />
    );
  }

  return (
    <List dense>
      {entities.map(entity => {
        const slug = entity.metadata.annotations?.[GITHUB_SLUG_ANNOTATION]!;
        return (
          <ListItem key={slug} className={classes.item}>
            <ListItemText
              disableTypography
              primary={
                <Link to={`https://github.com/${slug}`} externalLinkIcon>
                  <span className={classes.slug}>{slug}</span>
                </Link>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  {entity.metadata.title ?? entity.metadata.name}
                </Typography>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
}
