import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Espejo del tema de la demo (mui-tokens.css) — MUI light por defecto,
// dark con los valores de referencia de palette.mode='dark'.
const base: ThemeOptions = {
  shape: { borderRadius: 4 },
  typography: { fontFamily: 'Roboto, system-ui, sans-serif' }
};

export function getTheme(mode: 'light' | 'dark') {
  return createTheme({
    ...base,
    palette: {
      mode,
      primary: mode === 'dark' ? { main: '#90caf9' } : { main: '#1976d2' },
      warning: { main: mode === 'dark' ? '#ffa726' : '#ed6c02' },
      success: { main: mode === 'dark' ? '#66bb6a' : '#2e7d32' }
    }
  });
}
