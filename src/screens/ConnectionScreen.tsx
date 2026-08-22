import { Box, Typography, IconButton, Alert, Button, List, ListItemButton, ListItemText } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAppStore } from '../store/useAppStore';
import { FIXES, type DiagCause } from '../api/client';

export default function ConnectionScreen({ error, cause }: { error?: string; cause?: DiagCause }) {
  const { back } = useAppStore();
  const steps = cause ? FIXES[cause] : [];

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 3 }}>
      <IconButton onClick={back} sx={{ ml: -1, mt: 1 }}><ChevronLeftIcon /> <Typography sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 700 }}>Volver</Typography></IconButton>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>GtfsExposeAPI · OpenAPI 3.0</Typography>
      <Typography variant="h5" sx={{ mb: 2 }}>Conexión al feed</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {steps.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>Cómo resolverlo</Typography>
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {steps.map(([t, d], i) => (
              <ListItemButton key={i} disableRipple sx={{ cursor: 'default', alignItems: 'flex-start' }}>
                <ListItemText primary={t} secondary={<span dangerouslySetInnerHTML={{ __html: d }} />} />
              </ListItemButton>
            ))}
          </List>
        </>
      )}

      <Button variant="outlined" sx={{ mt: 3 }} onClick={() => window.location.reload()}>Reintentar</Button>
    </Box>
  );
}
