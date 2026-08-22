import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useStops, useRoutesAtStop } from '../api/queries';
import { useGeolocation } from '../lib/useGeolocation';
import { agencyNamesFor } from '../lib/agencyNames';
import RouteBadge from '../components/RouteBadge';
import MapView, { type MapViewHandle } from '../map/MapView';
import type { Agency } from '../api/types';

export default function StopDetailScreen({ agencies, themeMode }: { agencies: Agency[]; themeMode: 'light' | 'dark' }) {
  const { stopId, back, navToRoute } = useAppStore();
  const stopsQ = useStops();
  const mapRef = useRef<MapViewHandle>(null);
  const [mapTick, setMapTick] = useState(0);
  const geo = useGeolocation();

  const stop = (stopsQ.data || []).find((s) => s.id === stopId);
  const { routes, isLoading: routesLoading } = useRoutesAtStop(stop?.id ?? null);

  useEffect(() => {
    if (!stop || !mapRef.current) return;
    mapRef.current.clear();
    mapRef.current.setPin(stop.lat, stop.lon);
    const coords: [number, number][] = [[stop.lat, stop.lon]];
    if (geo.status === 'granted' && geo.lat != null && geo.lon != null) {
      mapRef.current.setUserLocation(geo.lat, geo.lon);
      coords.push([geo.lat, geo.lon]);
    }
    mapRef.current.fitBounds(coords, 70);
    // mapTick: re-dibuja cuando el mapa avisa que (re)quedó listo — ver comentario en MapView.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop?.id, geo.status, geo.lat, geo.lon, themeMode, mapTick]);

  if (!stopsQ.data) return <CircularProgress size={28} sx={{ m: 3 }} />;
  if (!stop) return null;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ px: 2, flexShrink: 0 }}>
        <IconButton onClick={back} sx={{ ml: -1, mt: 1 }}><ChevronLeftIcon /> <Typography sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 700 }}>Volver</Typography></IconButton>
        {stop.code && (
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>{stop.code}</Typography>
        )}
        <Typography variant="h5" sx={{ textAlign: 'center' }}>{stop.name}</Typography>
      </Box>

      <Box sx={{ flexShrink: 0, px: 2, pt: 1.5, pb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Rutas en esta parada</Typography>
        {routesLoading ? <CircularProgress size={24} /> : !routes.length ? (
          <Typography variant="body2" color="text.secondary">No se encontraron rutas para esta parada.</Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.25, overflowX: 'auto', pb: 1 }}>
            {routes.map((route) => (
              <Box
                key={route.id}
                onClick={() => navToRoute(route.id)}
                sx={{
                  flex: '0 0 auto', width: 148, p: 1.5, borderRadius: 1, bgcolor: 'background.paper',
                  display: 'flex', flexDirection: 'column', gap: 0.75, cursor: 'pointer'
                }}
              >
                <RouteBadge route={route} />
                <Typography
                  variant="body2" fontWeight={600}
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {route.long}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {agencyNamesFor([route], agencies)[0]}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, position: 'relative', bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider' }}>
        <MapView ref={mapRef} mode={themeMode} onReady={() => setMapTick((t) => t + 1)} />
      </Box>
    </Box>
  );
}
