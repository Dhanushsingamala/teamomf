import { makeStyles } from '@material-ui/core';
import { teamomf, radius } from '../theme/tokens';

/**
 * TEAMOMF wordmark, shown when the sidebar is expanded.
 *
 * A typographic treatment rather than an invented corporate logo: the
 * monogram tile plus a letter-spaced wordmark. Replaces the stock Backstage
 * logo that previously sat here.
 */
const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 30,
  },
  monogram: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: teamomf.saffron,
    color: teamomf.navySurface,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.02em',
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
  },
  wordmark: {
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: '0.2em',
  },
  sub: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8.5,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
});

export const LogoFull = () => {
  const classes = useStyles();

  return (
    <div className={classes.root} aria-label="TEAMOMF Developer Portal">
      <span className={classes.monogram} aria-hidden="true">
        TO
      </span>
      <span className={classes.text}>
        <span className={classes.wordmark}>TEAMOMF</span>
        <span className={classes.sub}>Developer Portal</span>
      </span>
    </div>
  );
};
