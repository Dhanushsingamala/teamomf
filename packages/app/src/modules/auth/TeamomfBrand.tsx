import { Typography, makeStyles } from '@material-ui/core';
import { teamomf, radius } from '../theme/tokens';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  monogram: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // Saffron tile on navy chrome: the TEAMOMF mark used across the app.
    color: teamomf.navySurface,
    backgroundColor: teamomf.saffron,
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '0.04em',
  },
  wordmark: {
    fontWeight: 700,
    letterSpacing: '0.22em',
    lineHeight: 1,
  },
  tagline: {
    color: theme.palette.text.secondary,
    letterSpacing: '0.04em',
    marginTop: 4,
  },
}));

/**
 * Text-based TEAMOMF brand treatment.
 *
 * Deliberately typographic: no invented logo asset and no claims about the
 * organisation beyond its name and what this application actually is.
 */
export function TeamomfBrand(props: {
  orgName: string;
  showTagline?: boolean;
}) {
  const classes = useStyles();
  const initials = props.orgName.slice(0, 2).toUpperCase();

  return (
    <div className={classes.root}>
      <div className={classes.monogram} aria-hidden="true">
        {initials}
      </div>
      <div>
        <Typography variant="h6" component="p" className={classes.wordmark}>
          {props.orgName}
        </Typography>
        {props.showTagline && (
          <Typography
            variant="caption"
            component="p"
            className={classes.tagline}
          >
            Internal Developer Platform
          </Typography>
        )}
      </div>
    </div>
  );
}
