import {
  createUnifiedTheme,
  genPageTheme,
  palettes,
  shapes,
} from '@backstage/theme';
import { fontFamily, radius, shadow, teamomf as t } from './tokens';

/**
 * The TEAMOMF theme.
 *
 * Built with Backstage's supported `createUnifiedTheme` API so that every
 * Backstage and Material UI component picks it up, rather than overriding
 * generated DOM by selector. Component overrides below are limited to shape,
 * spacing and colour -- no structural changes, so catalog, API docs and
 * TechDocs keep working exactly as before.
 */

/**
 * Backstage renders a coloured "page header" banner per page type. The default
 * theme uses multi-colour gradients (the teal/green look). We flatten these to
 * solid navy so the app reads as one product, and only vary the accent for
 * page types where a visual distinction is genuinely useful.
 */
function flatPage(color: string) {
  return genPageTheme({ colors: [color, color], shape: shapes.wave });
}

const pageTheme = {
  home: flatPage(t.navy),
  documentation: flatPage(t.navy),
  tool: flatPage(t.navy),
  service: flatPage(t.navy),
  website: flatPage(t.navy),
  library: flatPage(t.navy),
  other: flatPage(t.navy),
  app: flatPage(t.navy),
  apis: flatPage(t.navy),
  card: flatPage(t.navy),
};

/** Shared component overrides, parameterised by mode-specific surfaces. */
function components(mode: {
  paper: string;
  canvas: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  hover: string;
  isDark: boolean;
}): NonNullable<Parameters<typeof createUnifiedTheme>[0]['components']> {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode.canvas,
          // Backstage's default page background is a gradient; flatten it.
          backgroundImage: 'none',
        },
        // Visible, consistent keyboard focus everywhere.
        ':focus-visible': {
          outline: `2px solid ${t.saffron}`,
          outlineOffset: 2,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: radius.md,
        },
        elevation1: {
          border: `1px solid ${mode.border}`,
          boxShadow: mode.isDark ? 'none' : shadow.card,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          border: `1px solid ${mode.border}`,
          boxShadow: mode.isDark ? 'none' : shadow.card,
          transition: 'box-shadow 120ms ease, border-color 120ms ease',
          '&:hover': {
            boxShadow: mode.isDark ? 'none' : shadow.cardHover,
          },
        },
      },
    },

    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '18px 20px 6px',
        },
        title: {
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: { padding: '12px 20px 20px' },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
          paddingInline: 16,
        },
        containedPrimary: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        outlined: {
          borderColor: mode.border,
        },
      },
      defaultProps: { disableElevation: true },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          fontWeight: 500,
          backgroundColor: mode.hover,
        },
        outlined: {
          borderColor: mode.border,
          backgroundColor: 'transparent',
        },
        // Saffron is an accent, not a fill: tint the background, keep text dark.
        colorPrimary: {
          backgroundColor: mode.isDark ? t.navySurfaceHover : t.infoBg,
          color: mode.isDark ? t.darkTextPrimary : t.navy,
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: t.saffron,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minWidth: 'auto',
          paddingInline: 18,
          '&.Mui-selected': { color: mode.textPrimary },
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: mode.canvas },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: mode.border },
        head: {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: mode.textSecondary,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: mode.hover } },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          backgroundColor: mode.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: mode.border },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: t.borderStrong,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: t.navy,
            borderWidth: 2,
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md },
        standardSuccess: {
          backgroundColor: mode.isDark ? 'rgba(19,136,8,0.16)' : t.greenLight,
          color: mode.isDark ? t.darkTextPrimary : t.greenDark,
        },
        standardWarning: {
          backgroundColor: mode.isDark ? 'rgba(255,153,51,0.14)' : t.warningBg,
          color: mode.isDark ? t.darkTextPrimary : t.warning,
        },
      },
    },

    MuiLink: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          textDecorationColor: 'transparent',
          transition: 'text-decoration-color 120ms ease',
          '&:hover': { textDecorationColor: 'currentColor' },
        },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: mode.border } },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: t.navySurface,
          fontSize: '0.75rem',
          borderRadius: radius.sm,
        },
      },
    },

    // Backstage's own components -------------------------------------------

    // The page banner. Solid navy, no gradient, no wave artwork.
    BackstageHeader: {
      styleOverrides: {
        header: {
          backgroundImage: 'none',
          backgroundColor: t.navy,
          boxShadow: 'none',
          borderBottom: `3px solid ${t.saffron}`,
          padding: '24px 24px 20px',
        },
        title: { fontWeight: 700, letterSpacing: '-0.01em' },
        subtitle: { color: 'rgba(255,255,255,0.82)' },
        type: { color: 'rgba(255,255,255,0.72)' },
      },
    },

    BackstageHeaderLabel: {
      styleOverrides: {
        label: { color: 'rgba(255,255,255,0.72)' },
        value: { color: t.white, fontWeight: 600 },
      },
    },

    BackstagePage: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: mode.canvas },
      },
    },

    BackstageContent: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: mode.canvas },
      },
    },

    BackstageContentHeader: {
      styleOverrides: {
        title: { fontWeight: 600 },
      },
    },

    BackstageInfoCard: {
      styleOverrides: {
        header: { padding: '18px 20px 6px' },
      },
    },

    BackstageItemCardHeader: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: t.navy,
          color: t.white,
        },
      },
    },

    BackstageSidebar: {
      styleOverrides: {
        drawer: {
          backgroundColor: t.navySurface,
          borderRight: `1px solid ${t.navySurfaceHover}`,
        },
      },
    },

    BackstageSidebarItem: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.78)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: t.white,
          },
        },
        label: { fontWeight: 500, letterSpacing: '0.01em' },
        // Active section: tinted surface plus a saffron rail on the left.
        selected: {
          color: t.white,
          fontWeight: 600,
          backgroundColor: 'rgba(255,255,255,0.10)',
          borderLeft: `3px solid ${t.saffron}`,
        },
        highlightable: {
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
        },
        highlighted: { backgroundColor: 'rgba(255,255,255,0.10)' },
        buttonItem: { borderRadius: radius.sm },
        iconContainer: { color: 'inherit' },
        closedItemIcon: { color: 'inherit' },
        submenuArrow: { color: 'rgba(255,255,255,0.6)' },
        // The search box that lives inside the sidebar.
        searchRoot: {
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: radius.sm,
          border: '1px solid rgba(255,255,255,0.14)',
          '&:focus-within': { borderColor: t.saffron },
        },
        searchField: { color: t.white },
        searchFieldHTMLInput: {
          color: t.white,
          '&::placeholder': { color: 'rgba(255,255,255,0.55)', opacity: 1 },
        },
        searchContainer: { marginRight: 0 },
      },
    },
  };
}

export const teamomfLightTheme = createUnifiedTheme({
  fontFamily,
  defaultPageTheme: 'home',
  pageTheme,
  palette: {
    ...palettes.light,
    mode: 'light',
    type: 'light',
    primary: {
      main: t.navy,
      light: t.navyLight,
      dark: t.navyDark,
      contrastText: t.white,
    },
    secondary: {
      main: t.green,
      light: t.greenLight,
      dark: t.greenDark,
      contrastText: t.white,
    },
    error: { main: t.error, contrastText: t.white },
    warning: { main: t.saffronDark, contrastText: t.white },
    success: { main: t.green, contrastText: t.white },
    info: { main: t.navy, contrastText: t.white },
    background: { default: t.canvas, paper: t.white },
    text: {
      primary: t.textPrimary,
      secondary: t.textSecondary,
      disabled: t.textDisabled,
    },
    divider: t.border,
    border: t.border,
    // Darkened saffron for link text so it clears 4.5:1 on white.
    link: t.navy,
    linkHover: t.saffronText,
    textSubtle: t.textSecondary,
    textVerySubtle: t.textDisabled,
    textContrast: t.textPrimary,
    highlight: 'rgba(255, 153, 51, 0.22)',
    errorBackground: t.errorBg,
    warningBackground: t.warningBg,
    infoBackground: t.infoBg,
    errorText: t.error,
    warningText: t.warning,
    infoText: t.navy,
    gold: t.saffron,
    status: {
      ok: t.green,
      warning: t.saffronDark,
      error: t.error,
      pending: t.textSecondary,
      running: t.navy,
      aborted: t.textDisabled,
    },
    navigation: {
      background: t.navySurface,
      indicator: t.saffron,
      color: 'rgba(255,255,255,0.78)',
      selectedColor: t.white,
      navItem: { hoverBackground: 'rgba(255,255,255,0.08)' },
      submenu: { background: t.navySurfaceHover },
    },
    tabbar: { indicator: t.saffron },
  },
  components: components({
    paper: t.white,
    canvas: t.canvas,
    border: t.border,
    textPrimary: t.textPrimary,
    textSecondary: t.textSecondary,
    hover: t.surfaceAlt,
    isDark: false,
  }),
});

export const teamomfDarkTheme = createUnifiedTheme({
  fontFamily,
  defaultPageTheme: 'home',
  pageTheme,
  palette: {
    ...palettes.dark,
    mode: 'dark',
    type: 'dark',
    primary: {
      main: '#8C8CFF',
      light: '#B0B0FF',
      dark: t.navy,
      contrastText: '#0B0E1A',
    },
    secondary: {
      main: '#4CC63F',
      dark: t.greenDark,
      contrastText: '#0B0E1A',
    },
    error: { main: '#FF6B6B' },
    warning: { main: t.saffron },
    success: { main: '#4CC63F' },
    info: { main: '#8C8CFF' },
    background: { default: t.darkCanvas, paper: t.darkSurface },
    text: {
      primary: t.darkTextPrimary,
      secondary: t.darkTextSecondary,
      disabled: '#6B7495',
    },
    divider: t.darkBorder,
    border: t.darkBorder,
    link: '#A9A9FF',
    linkHover: t.saffron,
    textSubtle: t.darkTextSecondary,
    textVerySubtle: '#6B7495',
    textContrast: t.darkTextPrimary,
    highlight: 'rgba(255, 153, 51, 0.24)',
    errorBackground: 'rgba(255,107,107,0.14)',
    warningBackground: 'rgba(255,153,51,0.14)',
    infoBackground: 'rgba(140,140,255,0.14)',
    errorText: '#FF9A9A',
    warningText: t.saffron,
    infoText: '#A9A9FF',
    gold: t.saffron,
    status: {
      ok: '#4CC63F',
      warning: t.saffron,
      error: '#FF6B6B',
      pending: t.darkTextSecondary,
      running: '#8C8CFF',
      aborted: '#6B7495',
    },
    navigation: {
      background: '#070A18',
      indicator: t.saffron,
      color: 'rgba(255,255,255,0.74)',
      selectedColor: t.white,
      navItem: { hoverBackground: 'rgba(255,255,255,0.07)' },
      submenu: { background: t.darkSurfaceAlt },
    },
    tabbar: { indicator: t.saffron },
  },
  components: components({
    paper: t.darkSurface,
    canvas: t.darkCanvas,
    border: t.darkBorder,
    textPrimary: t.darkTextPrimary,
    textSecondary: t.darkTextSecondary,
    hover: t.darkSurfaceAlt,
    isDark: true,
  }),
});
