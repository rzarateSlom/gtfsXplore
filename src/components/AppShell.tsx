import { AppBar, Toolbar, Typography, IconButton, Box, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlaceIcon from '@mui/icons-material/Place';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import { useAppStore } from '../store/useAppStore';
import type { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  const { tab, goTab, toggleTheme, themeMode } = useAppStore();

  return (
    <Box sx={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr auto', maxWidth: 1440, mx: 'auto' }}>
      <AppBar position="static" color="primary" elevation={4}>
        <Toolbar sx={{ gap: 1.5 }}>
          <Typography variant="h6" sx={{ whiteSpace: 'nowrap' }}>Visor GTFS</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton color="inherit" onClick={toggleTheme} aria-label="Cambiar tema">
            {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>

      <Paper elevation={3} sx={{ zIndex: 10 }}>
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(_, v) => goTab(v)}
        >
          <BottomNavigationAction label="Cerca de ti" value="home" icon={<PlaceIcon />} />
          <BottomNavigationAction label="Rutas" value="routes" icon={<AltRouteIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
