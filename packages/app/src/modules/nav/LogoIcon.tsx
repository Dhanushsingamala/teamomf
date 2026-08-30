import { makeStyles } from '@material-ui/core';
import { teamomf, radius } from '../theme/tokens';

/**
 * TEAMOMF monogram, shown when the sidebar is collapsed.
 *
 * Replaces the stock Backstage logo icon.
 */
const useStyles = makeStyles({
  monogram: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: teamomf.saffron,
    color: teamomf.navySurface,
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: '0.02em',
  },
});

export const LogoIcon = () => {
  const classes = useStyles();

  return (
    <div className={classes.monogram} aria-label="TEAMOMF">
      <span aria-hidden="true">TO</span>
    </div>
  );
};
