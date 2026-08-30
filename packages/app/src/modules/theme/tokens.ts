/**
 * TEAMOMF design tokens.
 *
 * A single source of truth for the palette. Everything visual in the portal
 * derives from these values -- there are no colour literals scattered through
 * components.
 *
 * The palette is India-inspired but deliberately restrained: navy carries the
 * application, saffron is reserved for accent and emphasis, and green is used
 * only for success and positive state. Saffron and green are never used for
 * large surfaces.
 */

export const teamomf = {
  /** Primary application colour, from the Ashoka Chakra blue. */
  navy: '#000080',
  navyLight: '#1A1A99',
  navyDark: '#00005C',
  /** Deep navy used for the sidebar and other dark chrome. */
  navySurface: '#0A0A3D',
  navySurfaceHover: '#16166B',

  /** Accent. Used sparingly: selection indicators, focus, emphasis. */
  saffron: '#FF9933',
  saffronDark: '#CC6F14',
  /** Darkened saffron that reaches 4.5:1 on white for text/links. */
  saffronText: '#9A4F00',

  /** Secondary / success. */
  green: '#138808',
  greenDark: '#0E6606',
  greenLight: '#E6F4E4',

  white: '#FFFFFF',
  /** Very light neutral page background with a hint of blue. */
  canvas: '#F5F7FB',
  surfaceAlt: '#EEF1F8',

  border: '#D8DEEC',
  borderStrong: '#B9C2DA',

  textPrimary: '#111633',
  textSecondary: '#4A5273',
  textDisabled: '#8891AE',

  error: '#B3261E',
  errorBg: '#FDECEA',
  warning: '#8A5300',
  warningBg: '#FFF4E5',
  infoBg: '#E8ECF9',

  /** Dark-mode surfaces. */
  darkCanvas: '#0B0E1A',
  darkSurface: '#141A2E',
  darkSurfaceAlt: '#1C2440',
  darkBorder: '#2A3352',
  darkTextPrimary: '#EAEDF7',
  darkTextSecondary: '#A8B0CC',
} as const;

/** Corner radius scale. Rounded, but not pill-shaped. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

/**
 * Restrained elevation. Backstage's defaults are heavier than this design
 * wants, so cards rely on a border plus a barely-there shadow.
 */
export const shadow = {
  card: '0 1px 2px rgba(17, 22, 51, 0.04), 0 1px 3px rgba(17, 22, 51, 0.06)',
  cardHover:
    '0 2px 6px rgba(17, 22, 51, 0.08), 0 4px 12px rgba(17, 22, 51, 0.06)',
  popover: '0 4px 16px rgba(17, 22, 51, 0.12)',
} as const;

export const fontFamily = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(', ');
