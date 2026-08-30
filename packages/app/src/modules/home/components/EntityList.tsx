import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { Link, Progress, ResponseErrorPanel } from '@backstage/core-components';
import { entityRouteRef } from '@backstage/plugin-catalog-react';
import { useRouteRef } from '@backstage/core-plugin-api';
import type { Entity } from '@backstage/catalog-model';

const useStyles = makeStyles(theme => ({
  list: {
    padding: 0,
  },
  item: {
    paddingLeft: 0,
    paddingRight: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 'none' },
  },
  title: {
    fontWeight: 600,
  },
  chips: {
    display: 'flex',
    gap: theme.spacing(0.5),
    flexWrap: 'wrap',
    marginTop: theme.spacing(0.5),
  },
  chip: {
    height: 20,
    fontSize: '0.7rem',
    margin: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
    minHeight: 96,
    color: theme.palette.text.secondary,
  },
}));

/**
 * Shown when a card has nothing to display.
 *
 * These cards are intentionally left empty rather than populated with sample
 * entities: the portal only ever shows what is really registered in the
 * catalog. The message explains how to make real data appear.
 */
export function EmptyHint(props: { message: string; hint?: string }) {
  const classes = useStyles();
  return (
    <Box className={classes.empty}>
      <Typography variant="body2">{props.message}</Typography>
      {props.hint && (
        <Typography variant="caption" component="p" style={{ marginTop: 4 }}>
          {props.hint}
        </Typography>
      )}
    </Box>
  );
}

export function EntityList(props: {
  entities: Entity[];
  loading: boolean;
  error?: Error;
  emptyMessage: string;
  emptyHint?: string;
}) {
  const { entities, loading, error, emptyMessage, emptyHint } = props;
  const classes = useStyles();
  const entityRoute = useRouteRef(entityRouteRef);

  if (loading) {
    return <Progress />;
  }
  if (error) {
    return <ResponseErrorPanel error={error} />;
  }
  if (entities.length === 0) {
    return <EmptyHint message={emptyMessage} hint={emptyHint} />;
  }

  return (
    <List dense className={classes.list}>
      {entities.map(entity => {
        const name = entity.metadata.name;
        const namespace = entity.metadata.namespace ?? 'default';
        const type = (entity.spec as { type?: string } | undefined)?.type;
        const lifecycle = (entity.spec as { lifecycle?: string } | undefined)
          ?.lifecycle;

        return (
          <ListItem
            key={`${entity.kind}:${namespace}/${name}`}
            className={classes.item}
          >
            <ListItemText
              disableTypography
              primary={
                <Link
                  to={entityRoute({
                    kind: entity.kind.toLowerCase(),
                    namespace,
                    name,
                  })}
                  className={classes.title}
                >
                  {entity.metadata.title ?? name}
                </Link>
              }
              secondary={
                <>
                  {entity.metadata.description && (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      component="p"
                    >
                      {entity.metadata.description}
                    </Typography>
                  )}
                  <span className={classes.chips}>
                    {type && (
                      <Chip
                        size="small"
                        label={type}
                        variant="outlined"
                        className={classes.chip}
                      />
                    )}
                    {lifecycle && (
                      <Chip
                        size="small"
                        label={lifecycle}
                        variant="outlined"
                        className={classes.chip}
                      />
                    )}
                  </span>
                </>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
}
