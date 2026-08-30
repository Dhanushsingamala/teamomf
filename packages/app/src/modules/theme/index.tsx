import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import { UnifiedThemeProvider } from '@backstage/theme';
import LightIcon from '@material-ui/icons/WbSunny';
import DarkIcon from '@material-ui/icons/Brightness2';
import { teamomfDarkTheme, teamomfLightTheme } from './teamomfTheme';

/**
 * Registers the TEAMOMF themes and removes the stock Backstage ones.
 *
 * Both extensions use the same ids as Backstage's built-in themes
 * ('theme:app/light' and 'theme:app/dark'), which overrides them rather than
 * adding a third and fourth option to the Settings > Appearance list. The
 * default Backstage look is therefore not reachable anywhere in the app.
 */

const lightTheme = ThemeBlueprint.make({
  name: 'light',
  params: {
    theme: {
      id: 'light',
      title: 'TEAMOMF Light',
      variant: 'light',
      icon: <LightIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={teamomfLightTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

const darkTheme = ThemeBlueprint.make({
  name: 'dark',
  params: {
    theme: {
      id: 'dark',
      title: 'TEAMOMF Dark',
      variant: 'dark',
      icon: <DarkIcon />,
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={teamomfDarkTheme}>
          {children}
        </UnifiedThemeProvider>
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [lightTheme, darkTheme],
});

export { teamomfLightTheme, teamomfDarkTheme };
