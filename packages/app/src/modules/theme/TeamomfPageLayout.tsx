import { useLocation } from 'react-router-dom';
import { Typography, makeStyles } from '@material-ui/core';
import { Link } from '@backstage/core-components';
import type { PageLayoutProps } from '@backstage/frontend-plugin-api';
import { teamomf as t } from './tokens';

/**
 * The chrome around every page's content -- everything to the right of the
 * sidebar.
 *
 * Backstage's default implementation of the `core.page-layout` swappable
 * component (`DefaultPageLayout` in @backstage/frontend-plugin-api) is written
 * with inline styles and hardcoded colours -- `#fff`, `#ddd`, `#333` -- so it
 * ignores the app theme completely. On this portal that produced a plain white
 * bar with a grey rule above every page, including a stray "Home" bar on the
 * landing page, none of which was TEAMOMF branded.
 *
 * This replacement is the same layout expressed through the theme: a slim navy
 * bar on the sidebar's surface colour, with themed tabs. It also honours
 * `noHeader`, which the default implementation accepts as a prop and then never
 * reads -- the home page sets it, and renders its own branded header instead
 * (see modules/home/HomeLayout).
 */
const useStyles = makeStyles(
  theme => ({
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      minHeight: 0,
      backgroundColor: theme.palette.background.default,
    },
    // Deliberately a slim bar on the sidebar's own surface colour rather than
    // a second page banner: most plugin pages (catalog, scaffolder, TechDocs,
    // API docs) render a header of their own underneath this one, so this has
    // to read as a continuation of the nav chrome, not compete with it.
    header: {
      flexShrink: 0,
      backgroundColor: t.navySurface,
      color: t.white,
      borderBottom: `1px solid ${t.navySurfaceHover}`,
    },
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.25),
      padding: theme.spacing(1.25, 3),
    },
    titleRowWithTabs: {
      paddingBottom: theme.spacing(0.5),
    },
    icon: {
      display: 'flex',
      alignItems: 'center',
      fontSize: 20,
      color: t.saffron,
    },
    title: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      color: t.white,
    },
    titleLink: {
      color: 'inherit',
      '&:hover': { color: 'inherit' },
    },
    actions: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
    },
    tabs: {
      display: 'flex',
      flexWrap: 'wrap',
      padding: theme.spacing(0, 3),
    },
    tab: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.75),
      padding: theme.spacing(1, 1.75),
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '0.01em',
      color: 'rgba(255,255,255,0.72)',
      textDecoration: 'none',
      borderBottom: '3px solid transparent',
      transition: 'color 120ms ease, border-color 120ms ease',
      '&:hover': {
        color: t.white,
        textDecoration: 'none',
      },
    },
    tabSelected: {
      color: t.white,
      borderBottomColor: t.saffron,
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      minHeight: 0,
    },
  }),
  { name: 'TeamomfPageLayout' },
);

/**
 * The tab whose href is the longest prefix of the current path.
 *
 * Longest-prefix rather than exact match because tab hrefs are page-relative
 * roots -- `/docs/default/component/x` has to keep the `/docs` tab lit.
 */
function useSelectedTabId(tabs: PageLayoutProps['tabs']): string | undefined {
  const { pathname } = useLocation();
  if (!tabs?.length) {
    return undefined;
  }
  return tabs
    .filter(tab => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id;
}

export function TeamomfPageLayout(props: PageLayoutProps) {
  const { title, icon, noHeader, titleLink, headerActions, tabs, children } =
    props;
  const classes = useStyles();
  const selectedTabId = useSelectedTabId(tabs);

  const hasTabs = Boolean(tabs?.length);
  const actions = headerActions?.filter(Boolean) ?? [];
  const showHeader = !noHeader && (Boolean(title) || hasTabs);

  return (
    <div data-component="page-layout" className={classes.root}>
      {showHeader && (
        <header className={classes.header}>
          {title && (
            <div
              className={`${classes.titleRow} ${
                hasTabs ? classes.titleRowWithTabs : ''
              }`}
            >
              {icon && <span className={classes.icon}>{icon}</span>}
              <Typography component="h1" className={classes.title} noWrap>
                {titleLink ? (
                  <Link to={titleLink} className={classes.titleLink}>
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </Typography>
              {actions.length > 0 && (
                <div className={classes.actions}>{actions}</div>
              )}
            </div>
          )}
          {hasTabs && (
            <nav className={classes.tabs}>
              {tabs!.map(tab => (
                <Link
                  key={tab.id}
                  to={tab.href}
                  className={`${classes.tab} ${
                    tab.id === selectedTabId ? classes.tabSelected : ''
                  }`}
                  aria-current={tab.id === selectedTabId ? 'page' : undefined}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
        </header>
      )}
      <div className={classes.content}>{children}</div>
    </div>
  );
}
