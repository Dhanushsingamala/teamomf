import { Grid, Typography, makeStyles } from '@material-ui/core';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import SearchIcon from '@material-ui/icons/Search';
import { Link } from '@backstage/core-components';
import { CatalogIcon, DocsIcon, GroupIcon } from '@backstage/core-components';
import ExtensionIcon from '@material-ui/icons/Extension';

const useStyles = makeStyles(theme => ({
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    padding: theme.spacing(1.25, 1.5),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.primary,
    textDecoration: 'none',
    height: '100%',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
      textDecoration: 'none',
    },
  },
  icon: {
    display: 'flex',
    color: theme.palette.primary.main,
  },
  label: {
    fontWeight: 600,
    lineHeight: 1.2,
  },
  hint: {
    color: theme.palette.text.secondary,
    fontSize: '0.7rem',
  },
}));

/**
 * Navigation into the parts of the portal an engineer actually uses.
 *
 * Every destination is a route served by a plugin installed in this app --
 * there are no placeholder or "coming soon" tiles.
 */
export function QuickActions() {
  const classes = useStyles();

  const actions = [
    {
      to: '/catalog',
      label: 'Software Catalog',
      hint: 'Services, systems and resources',
      icon: <CatalogIcon fontSize="small" />,
    },
    {
      to: '/api-docs',
      label: 'API Explorer',
      hint: 'Registered API definitions',
      icon: <ExtensionIcon fontSize="small" />,
    },
    {
      to: '/docs',
      label: 'TechDocs',
      hint: 'Documentation from repositories',
      icon: <DocsIcon fontSize="small" />,
    },
    {
      to: '/create',
      label: 'Create',
      hint: 'Scaffold a new component',
      icon: <AddCircleOutlineIcon fontSize="small" />,
    },
    {
      to: '/catalog?filters%5Bkind%5D=group',
      label: 'Teams',
      hint: 'Groups and ownership',
      icon: <GroupIcon fontSize="small" />,
    },
    {
      to: '/search',
      label: 'Search',
      hint: 'Across catalog and docs',
      icon: <SearchIcon fontSize="small" />,
    },
  ];

  return (
    <Grid container spacing={1}>
      {actions.map(action => (
        <Grid item xs={12} sm={6} key={action.to}>
          <Link to={action.to} className={classes.action}>
            <span className={classes.icon}>{action.icon}</span>
            <span>
              <Typography
                component="span"
                display="block"
                className={classes.label}
              >
                {action.label}
              </Typography>
              <Typography
                component="span"
                display="block"
                className={classes.hint}
              >
                {action.hint}
              </Typography>
            </span>
          </Link>
        </Grid>
      ))}
    </Grid>
  );
}
