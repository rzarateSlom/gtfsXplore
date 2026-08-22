import { Box, Typography, TextField, InputAdornment, List, CircularProgress, Alert, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useGeolocation } from '../lib/useGeolocation';
import { useStops, useStopsByName, useStopsNearby } from '../api/queries';
import StopRow from '../components/StopRow';
import type { Agency } from '../api/types';

const NEARBY_RADIUS_M = 2000;

export default function HomeScreen({ agencies }: { agencies: Agency[] }) {
  const { query, setQuery, navToStop } = useAppStore();
  const stopsQ = useStops();
  const remote = useStopsByName(query.trim());
  const geo = useGeolocation();
  const nearbyQ = useStopsNearby(geo.status === 'granted' ? geo.lat : null, geo.status === 'granted' ? geo.lon : null, NEARBY_RADIUS_M);
  const usingDeviceLocation = geo.status === 'granted' && !!nearbyQ.data;
  const refreshing = geo.status === 'locating' || nearbyQ.isFetching;

  const handleRefresh = () => {
    geo.refresh();
    if (geo.status === 'granted') nearbyQ.refetch();
  };

  const list = useMemo(() => {
    const all = stopsQ.data || [];
    const q = query.trim().toLowerCase();
    if (q) {
      const local = all.filter((s) => s.name.toLowerCase().includes(q));
      return (remote.data && remote.data.length ? remote.data : local).slice(0, 60);
    }
    if (usingDeviceLocation) return (nearbyQ.data || []).slice(0, 30);
    return all.slice().sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0)).slice(0, 30);
  }, [stopsQ.data, query, remote.data, usingDeviceLocation, nearbyQ.data]);

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 3 }}>
      <Box sx={{ pt: 1.5 }}>
        <TextField
          fullWidth size="small" placeholder="Buscar parada" value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>

      {!query.trim() && geo.status === 'denied' && (
        <Alert severity="info" sx={{ mt: 2 }} action={<Button size="small" onClick={geo.retry}>Reintentar</Button>}>
          Activá la ubicación para ver las paradas más cercanas a vos. Mostrando el centro del feed mientras tanto.
        </Alert>
      )}
      {!query.trim() && geo.status === 'error' && (
        <Alert severity="warning" sx={{ mt: 2 }} action={<Button size="small" onClick={geo.retry}>Reintentar</Button>}>
          No se pudo obtener tu ubicación ({geo.error}).
        </Alert>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2.5, mb: 1, textAlign: 'center' }}>
        {query.trim()
          ? `${list.length} resultado${list.length === 1 ? '' : 's'}`
          : geo.status === 'locating' && !usingDeviceLocation
          ? 'Buscando tu ubicación…'
          : usingDeviceLocation
          ? `Paradas cercanas · ${NEARBY_RADIUS_M / 1000} km`
          : 'Paradas cercanas'}
      </Typography>

      {!query.trim() && (
        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Obteniendo…' : 'Obtener'}
          </Button>
        </Box>
      )}

      {stopsQ.isLoading || (geo.status === 'granted' && nearbyQ.isLoading && !nearbyQ.data) ? <CircularProgress size={28} /> : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
          {list.map((s) => (
            <StopRow key={s.id} stop={s} agencies={agencies} onClick={() => navToStop(s.id)} />
          ))}
        </List>
      )}
    </Box>
  );
}
