import { Fragment, useMemo } from 'react';
import { Typography, makeStyles } from '@material-ui/core';
import { Content } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { CustomHomepageGrid } from '@backstage/plugin-home';
import type { Breakpoint } from '@backstage/plugin-home';
import type { HomePageLayoutProps } from '@backstage/plugin-home-react/alpha';
import { radius, teamomf as t } from '../theme/tokens';

/**
 * Twelve columns at every desktop breakpoint.
 *
 * This is the fix for the misaligned widgets. The default column counts are
 * `{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }`, but the home page only ever
 * supplies ONE layout -- the `defaultConfig` in app-config.yaml, which is
 * authored against 12 columns. react-grid-layout reuses that layout for every
 * other breakpoint and clamps it to fit, so on any window between 960px and
 * 1280px a widget at column 8 with width 4 no longer fits in 10 columns, gets
 * shoved to column 6, collides with its neighbour and is pushed down a row.
 * That is what makes the boxes look ragged -- and 960-1280px is an ordinary
 * laptop window, especially at 125% display scaling.
 *
 * Keeping 12 columns down to 960px means the configured grid renders exactly
 * as written. Below that, four columns turns every widget full-width (all
 * configured widths are >= 4) so the page becomes a clean single-column stack
 * instead of a partially clamped, overlapping one.
 */
const COLS: Record<Breakpoint, number> = {
  xl: 12,
  lg: 12,
  md: 12,
  sm: 4,
  xs: 4,
  xxs: 4,
};

/** Gap between widgets, in pixels. Equal horizontally and vertically. */
const GUTTER = 16;

const useStyles = makeStyles(
  theme => ({
    hero: {
      backgroundColor: t.navy,
      color: t.white,
      padding: theme.spacing(4, 3, 3.5),
      borderBottom: `3px solid ${t.saffron}`,
    },
    heroTitle: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    heroSubtitle: {
      color: 'rgba(255,255,255,0.82)',
      marginTop: theme.spacing(0.5),
      maxWidth: '68ch',
    },
    content: {
      flexGrow: 1,
    },
    grid: {
      // Widgets that render a Card are already stretched to fill their cell by
      // CustomHomepageGrid. Widgets that render without one -- the search bar
      // is the only such widget here, because it supplies its own `Renderer`
      // and so never gets wrapped in a card -- were left top-aligned inside an
      // oversized cell. Centring them lines them up with the cards.
      '& .react-grid-item': {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      },
      // The search bar hardcodes `1px solid #555` on its outline. Pull it back
      // onto the palette so it reads as one of the cards rather than a stray
      // grey box at the top of the page.
      '& .react-grid-item .MuiOutlinedInput-root': {
        backgroundColor: theme.palette.background.paper,
        borderRadius: radius.md,
      },
      '& .react-grid-item .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.divider,
        borderRadius: radius.md,
      },
      '& .react-grid-item .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      },
    },
  }),
  { name: 'TeamomfHomeLayout' },
);

/**
 * The TEAMOMF home page layout.
 *
 * Replaces `DefaultHomePageLayout` from @backstage/plugin-home, which renders
 * the widget grid with default column counts and default gutters. Two things
 * change here: the grid keeps 12 columns so the layout configured in
 * app-config.yaml is honoured at every width (see COLS above), and the page
 * gets a branded header -- the home page sets `noHeader`, so without this it
 * had no themed chrome of its own at all.
 */
export function HomeLayout(props: HomePageLayoutProps) {
  const { widgets, defaultConfig } = props;
  const classes = useStyles();
  const configApi = useApi(configApiRef);
  const orgName = configApi.getOptionalString('organization.name') ?? 'TEAMOMF';
  const appTitle =
    configApi.getOptionalString('app.title') ?? `${orgName} Developer Portal`;

  const gridConfig = useMemo(
    () =>
      defaultConfig?.map(item => ({
        component: item.component,
        x: item.column,
        y: item.row,
        width: item.width,
        height: item.height,
        movable: item.movable,
        deletable: item.deletable,
        resizable: item.resizable,
      })),
    [defaultConfig],
  );

  return (
    <>
      <div className={classes.hero}>
        <Typography variant="h4" component="h1" className={classes.heroTitle}>
          {appTitle}
        </Typography>
        <Typography variant="body2" className={classes.heroSubtitle}>
          Services, APIs, documentation and templates for every {orgName} team,
          in one place.
        </Typography>
      </div>
      <Content className={classes.content}>
        <div className={classes.grid}>
          <CustomHomepageGrid
            title="Dashboard"
            config={gridConfig}
            cols={COLS}
            containerMargin={[GUTTER, GUTTER]}
            containerPadding={[0, 0]}
          >
            {widgets.map((widget, index) => (
              <Fragment key={widget.name ?? index}>{widget.component}</Fragment>
            ))}
          </CustomHomepageGrid>
        </div>
      </Content>
    </>
  );
}
