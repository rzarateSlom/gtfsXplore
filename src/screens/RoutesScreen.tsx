import { Box, Typography, Select, MenuItem, IconButton, List, ListItemButton, ListItemText, CircularProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { useAppStore } from '../store/useAppStore';
import { useAgencies, useRoutes } from '../api/queries';
import RouteBadge from '../components/RouteBadge';

export default function RoutesScreen() {
  const { agency, setAgency, favAgency, toggleFavAgency, navToRoute } = useAppStore();
  const agenciesQ = useAgencies();
  const routesQ = useRoutes();
  const isFav = !!agency && agency === favAgency;

  const list = (routesQ.data || [])
    .filter((r) => r.agencyId === agency)
    .slice()
    .sort((a, b) => a.short.localeCompare(b.short, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 3 }}>
      <Typography variant="h5" sx={{ pt: 1.5, mb: 1.5 }}>Rutas</Typography>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Select
          fullWidth size="small" displayEmpty value={agency}
          onChange={(e) => setAgency(e.target.value)}
        >
          <MenuItem value="">Elegí una agencia</MenuItem>
          {(agenciesQ.data || []).map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
        </Select>
        <IconButton
          disabled={!agency}
          onClick={() => toggleFavAgency(isFav ? '' : agency)}
          sx={{ color: isFav ? 'warning.main' : 'text.secondary' }}
          title="Marcar como favorita"
        >
          {isFav ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
      </Box>

      {!agency ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Elegí una agencia</Typography>
          <Typography variant="body2" color="text.secondary">Seleccioná un operador arriba para ver sus rutas.</Typography>
        </Box>
      ) : routesQ.isLoading ? <CircularProgress size={28} sx={{ mt: 3 }} /> : (
        <List sx={{ mt: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          {list.map((r) => (
            <ListItemButton key={r.id} onClick={() => navToRoute(r.id)} sx={{ gap: 2 }}>
              <RouteBadge route={r} />
              <ListItemText primary={r.long} secondary={r.typeName} />
              <ChevronRight color="disabled" />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
