import { Box, Typography, IconButton, ToggleButtonGroup, ToggleButton, Tabs, Tab, List, ListItemButton, ListItemText, Table, TableBody, TableRow, TableCell, Chip, CircularProgress } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MapIcon from '@mui/icons-material/Map';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useRoutes, useRouteDetail, useShapes, useActiveServices, useCalendar, useStops } from '../api/queries';
import { onColor, fmt } from '../lib/gtfs';
import { agencyNamesFor } from '../lib/agencyNames';
import MapView, { type MapViewHandle, type StopMarkerSpec } from '../map/MapView';
import type { Agency } from '../api/types';

export default function RouteDetailScreen({ agencies, themeMode }: { agencies: Agency[]; themeMode: 'light' | 'dark' }) {
  const { routeId, routeTab, routeParadasMode, dir, back, setRouteTab, setDir, toggleRouteMap, navToStop } = useAppStore();
  const routesQ = useRoutes();
  const route = (routesQ.data || []).find((r) => r.id === routeId);
  const activeServices = useActiveServices();
  const detailQ = useRouteDetail(routeId, route, activeServices);
  const shapesQ = useShapes();
  const calQ = useCalendar();
  const stopsQ = useStops();
  const stopsById = useMemo(() => new Map((stopsQ.data || []).map((s) => [s.id, s])), [stopsQ.data]);
  const mapRef = useRef<MapViewHandle>(null);
  const [mapTick, setMapTick] = useState(0);

  const cur = detailQ.data?.dirs[dir]?.pattern.length ? detailQ.data.dirs[dir] : detailQ.data?.dirs[0];

  useEffect(() => {
    if (routeParadasMode !== 'map' || !route || !cur || !mapRef.current) return;
    const map = mapRef.current;
    map.clear();

    const stops = cur.pattern.map((p) => stopsById.get(p.stopId)).filter((s): s is NonNullable<typeof s> => !!s);
    const stopPts: [number, number][] = stops.map((s) => [s.lat, s.lon]);

    const shapeCoords = cur.shapeId ? shapesQ.data?.get(cur.shapeId) : undefined;
    const lineCoords = shapeCoords && shapeCoords.length > 1 ? shapeCoords : stopPts;

    if (lineCoords.length > 1) map.setRouteLine(lineCoords, route.color);
    if (stops.length) {
      const markers: StopMarkerSpec[] = stops.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, color: route.color, radius: 5, onClick: navToStop }));
      map.setStopMarkers(markers);
    }
    if (lineCoords.length || stopPts.length) map.fitBounds(lineCoords.length > 1 ? lineCoords : stopPts, 40);
    // mapTick: re-dibuja cuando el mapa avisa que (re)quedó listo — ver comentario en MapView.
  }, [routeParadasMode, route, cur, shapesQ.data, stopsById, navToStop, mapTick]);

  if (!route) return null;

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', overscrollBehaviorY: 'contain', px: 2, pb: 3, display: 'flex', flexDirection: 'column' }}>
      <IconButton onClick={back} sx={{ alignSelf: 'flex-start', ml: -1, mt: 1 }}><ChevronLeftIcon /> <Typography sx={{ textTransform: 'uppercase', fontSize: 13, fontWeight: 700 }}>Volver</Typography></IconButton>

      <Box sx={{ bgcolor: route.color, color: onColor(route.color), borderRadius: 1, p: 2, mt: 1.5 }}>
        <Typography variant="h6">{route.short} · {route.long}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
          {agencyNamesFor([route], agencies)[0]} · {route.typeName}
        </Typography>
      </Box>

      {detailQ.data && (
        <ToggleButtonGroup exclusive fullWidth value={dir} onChange={(_, v) => v !== null && setDir(v)} sx={{ mt: 1.5 }}>
          {[0, 1].map((d) => (
            <ToggleButton key={d} value={d} disabled={!detailQ.data!.dirs[d].pattern.length}>
              Hacia {detailQ.data!.dirs[d].headsign}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Tabs value={routeTab} onChange={(_, v) => setRouteTab(v)} sx={{ mt: 2 }}>
        <Tab label="Paradas" value="paradas" />
        <Tab label="Servicio" value="servicio" />
      </Tabs>

      {!detailQ.data ? <CircularProgress size={28} sx={{ mt: 3 }} /> : routeTab === 'paradas' ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5, mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">{cur?.pattern.length ?? 0} paradas</Typography>
            <Chip
              size="small" variant="outlined" color="primary"
              icon={routeParadasMode === 'map' ? <ViewListIcon fontSize="small" /> : <MapIcon fontSize="small" />}
              label={routeParadasMode === 'map' ? 'Ver lista' : 'Ver en mapa'}
              onClick={toggleRouteMap}
            />
          </Box>

          {routeParadasMode === 'map' ? (
            <Box sx={{ height: 'min(48vh, 420px)', borderRadius: 1, overflow: 'hidden', position: 'relative', bgcolor: 'action.hover' }}>
              <MapView ref={mapRef} mode={themeMode} onReady={() => setMapTick((t) => t + 1)} />
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {cur?.pattern.map((p, i, arr) => {
                const isFirst = i === 0, isLast = i === arr.length - 1;
                return (
                  <Box key={p.seq} sx={{ display: 'flex' }}>
                    <Box sx={{ width: 24, position: 'relative', alignSelf: 'stretch', flexShrink: 0 }}>
                      <Box sx={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 2,
                        top: isFirst ? '50%' : 0, bottom: isLast ? '50%' : 0,
                        bgcolor: route.color, opacity: 0.45
                      }} />
                      <Box sx={{
                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                        width: 10, height: 10, borderRadius: '50%', bgcolor: route.color,
                        border: '2px solid', borderColor: 'background.paper'
                      }} />
                    </Box>
                    <ListItemButton onClick={() => navToStop(p.stopId)} sx={{ flex: 1, py: 1.25, pl: 1 }}>
                      <ListItemText primary={stopsById.get(p.stopId)?.name || p.stopId} />
                    </ListItemButton>
                  </Box>
                );
              })}
            </List>
          )}
        </>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Servicios que operan la ruta</Typography>
          <Table size="small">
            <TableBody>
              {(detailQ.data.dirs[0].services.concat(detailQ.data.dirs[1].services).filter((v, i, a) => a.indexOf(v) === i)).map((sid) => (
                <TableRow key={sid}>
                  <TableCell>{sid}</TableCell>
                  <TableCell>{activeServices.has(sid) ? <Chip label="SÍ" size="small" color="success" /> : 'no'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
