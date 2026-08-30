import { useCallback, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { ProxiedSignInPage } from '@backstage/core-components';
import {
  configApiRef,
  discoveryApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import type { SignInPageProps } from '@backstage/plugin-app-react';
import { TeamomfBrand } from './TeamomfBrand';
import { teamomf } from '../theme/tokens';

/** The auth provider id registered by the teamomf-credentials backend. */
const PROVIDER_ID = 'teamomf';

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  aside: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: theme.spacing(6),
    color: '#FFFFFF',
    backgroundColor: teamomf.navySurface,
    borderRight: `4px solid ${teamomf.saffron}`,
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  asideHeadline: {
    fontWeight: 700,
    lineHeight: 1.2,
    maxWidth: '14em',
  },
  asideBody: {
    marginTop: theme.spacing(2),
    maxWidth: '30em',
    opacity: 0.92,
    lineHeight: 1.6,
  },
  asideList: {
    listStyle: 'none',
    padding: 0,
    margin: `${theme.spacing(3)}px 0 0`,
    display: 'grid',
    gap: theme.spacing(1),
  },
  asideListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    opacity: 0.92,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    flexShrink: 0,
  },
  asideFooter: {
    opacity: 0.75,
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4, 3),
  },
  form: {
    width: '100%',
    maxWidth: 380,
  },
  mobileBrand: {
    marginBottom: theme.spacing(4),
    [theme.breakpoints.up('md')]: {
      display: 'none',
    },
  },
  heading: {
    fontWeight: 700,
  },
  subheading: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(3.5),
  },
  field: {
    marginBottom: theme.spacing(2.5),
  },
  submit: {
    height: 46,
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'none',
    fontSize: '0.95rem',
  },
  alert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2.5),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.error.main}`,
    backgroundColor:
      theme.palette.type === 'dark'
        ? 'rgba(244, 67, 54, 0.12)'
        : 'rgba(244, 67, 54, 0.06)',
    color: theme.palette.error.main,
  },
  alertIcon: {
    fontSize: 18,
    marginTop: 1,
    flexShrink: 0,
  },
  footnote: {
    marginTop: theme.spacing(3),
    color: theme.palette.text.secondary,
    lineHeight: 1.6,
    display: 'block',
  },
  pending: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
}));

/**
 * TEAMOMF credential sign-in.
 *
 * The authentication flow is unchanged from the original implementation:
 *  1. POST the credentials to the teamomf-credentials backend, which verifies
 *     the scrypt hash and returns an HTTP-only session cookie.
 *  2. Hand off to Backstage's ProxiedSignInPage, which calls
 *     /api/auth/teamomf/refresh with `credentials: 'include'`. The backend
 *     exchanges the cookie for a real Backstage identity token carrying the
 *     user's catalog group memberships.
 *
 * Only the presentation layer differs. The password is still held in
 * component state solely for the duration of the request, and the session
 * cookie is still never readable from JavaScript.
 */
export function TeamomfSignInPage(props: SignInPageProps) {
  const classes = useStyles();
  const discoveryApi = useApi(discoveryApiRef);
  const configApi = useApi(configApiRef);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const orgName = configApi.getOptionalString('organization.name') ?? 'TEAMOMF';

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(undefined);
      setBusy(true);
      try {
        const baseUrl = await discoveryApi.getBaseUrl('teamomf-credentials');
        const response = await fetch(`${baseUrl}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          setError(body.error ?? `Sign-in failed (${response.status})`);
          setBusy(false);
          return;
        }

        // Drop the password from memory as soon as it is no longer needed.
        setPassword('');
        setAuthenticated(true);
      } catch (e) {
        setError(
          e instanceof Error
            ? `Could not reach the ${orgName} backend: ${e.message}`
            : `Could not reach the ${orgName} backend`,
        );
        setBusy(false);
      }
    },
    [discoveryApi, username, password, orgName],
  );

  // Once the cookie is set, let Backstage exchange it for an identity.
  if (authenticated) {
    return (
      <ProxiedSignInPage
        {...props}
        provider={PROVIDER_ID}
        ErrorComponent={({ error: proxyError }) => (
          <div className={classes.main} style={{ minHeight: '100vh' }}>
            <div className={classes.form}>
              <Box mb={4}>
                <TeamomfBrand orgName={orgName} showTagline />
              </Box>
              <Typography variant="h5" className={classes.heading}>
                Could not complete sign-in
              </Typography>
              <Typography variant="body2" className={classes.subheading}>
                Your password was accepted, but the portal could not issue an
                identity.
              </Typography>
              <div className={classes.alert} role="alert">
                <ErrorOutlineIcon className={classes.alertIcon} />
                <Typography variant="body2">
                  {proxyError?.message ??
                    `The ${orgName} session was rejected.`}
                </Typography>
              </div>
              <Typography variant="body2" color="textSecondary">
                This usually means no <code>User</code> entity in the catalog
                has a <code>spec.profile.email</code> matching your login email.
                Provision one with <code>yarn teamomf:user add</code>.
              </Typography>
              <Box mt={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setAuthenticated(false);
                    setBusy(false);
                  }}
                >
                  Back to sign-in
                </Button>
              </Box>
            </div>
          </div>
        )}
      />
    );
  }

  return (
    <div className={classes.root}>
      <aside className={classes.aside}>
        <TeamomfBrand orgName={orgName} showTagline />
        <div>
          <Typography variant="h3" className={classes.asideHeadline}>
            One place for every service you build and run.
          </Typography>
          <Typography variant="body1" className={classes.asideBody}>
            Sign in to browse the software catalog, read API definitions and
            documentation, and jump straight to the source.
          </Typography>
          <ul className={classes.asideList}>
            {[
              'Software catalog with real ownership',
              'API definitions and TechDocs',
              'Templates for new components',
            ].map(item => (
              <li key={item} className={classes.asideListItem}>
                <span className={classes.bullet} />
                <Typography variant="body2">{item}</Typography>
              </li>
            ))}
          </ul>
        </div>
        <Typography variant="caption" className={classes.asideFooter}>
          TEAMOMF Platform Engineering
        </Typography>
      </aside>

      <main className={classes.main}>
        <div className={classes.form}>
          <div className={classes.mobileBrand}>
            <TeamomfBrand orgName={orgName} showTagline />
          </div>

          <Typography variant="h5" component="h1" className={classes.heading}>
            Sign in
          </Typography>
          <Typography variant="body2" className={classes.subheading}>
            Use your {orgName} developer portal credentials.
          </Typography>

          {error && (
            <div className={classes.alert} role="alert">
              <ErrorOutlineIcon className={classes.alertIcon} />
              <Typography variant="body2">{error}</Typography>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              className={classes.field}
              id="teamomf-username"
              label="Username or email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              required
              disabled={busy}
              variant="outlined"
              size="medium"
              autoComplete="username"
            />
            <TextField
              className={classes.field}
              id="teamomf-password"
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              disabled={busy}
              variant="outlined"
              size="medium"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disableElevation
              className={classes.submit}
              disabled={busy || !username || !password}
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <Divider style={{ marginTop: 28 }} />
          <Typography variant="caption" className={classes.footnote}>
            Accounts are provisioned by a platform administrator with{' '}
            <code>yarn teamomf:user add</code>. Contact the {orgName} platform
            team if you need access.
          </Typography>
        </div>
      </main>
    </div>
  );
}
