import { ThemeProvider, CssBaseline } from '@mui/material';
import { useMemo } from 'react';
import { useAppStore } from './store/useAppStore';
import { getTheme } from './theme/theme';
import { useAgencies, useRoutes, useStops, useCalendar, useActiveServices, usePrefetchRoutes } from './api/queries';
import { ApiError } from './api/client';
import AppShell from './components/AppShell';
import HomeScreen from './screens/HomeScreen';
import RoutesScreen from './screens/RoutesScreen';
import RouteDetailScreen from './screens/RouteDetailScreen';
import StopDetailScreen from './screens/StopDetailScreen';
import ConnectionScreen from './screens/ConnectionScreen';

export default function App() {
  const { view, themeMode } = useAppStore();
  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  const agenciesQ = useAgencies();
  const routesQ = useRoutes();
  const stopsQ = useStops();
  const calQ = useCalendar();
  const activeServices = useActiveServices();
  usePrefetchRoutes(routesQ.data, activeServices, 30); // colorea íconos de "Cerca de ti" en 2do plano

  const anyError = [agenciesQ, routesQ, stopsQ, calQ].find((q) => q.isError);
  const errorObj = anyError?.error as ApiError | Error | undefined;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ height: '100vh' }}>
        <AppShell>
          {anyError ? (
            <ConnectionScreen
              error={errorObj?.message}
              cause={(errorObj as ApiError)?.diag?.cause ?? 'cors'}
            />
          ) : view === 'route' ? (
            <RouteDetailScreen agencies={agenciesQ.data || []} themeMode={themeMode} />
          ) : view === 'stop' ? (
            <StopDetailScreen agencies={agenciesQ.data || []} themeMode={themeMode} />
          ) : useAppStore.getState().tab === 'routes' ? (
            <RoutesScreen />
          ) : (
            <HomeScreen agencies={agenciesQ.data || []} />
          )}
        </AppShell>
      </div>
    </ThemeProvider>
  );
}
