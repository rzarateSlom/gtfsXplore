import { Avatar, Box, ListItemButton, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import SubwayIcon from '@mui/icons-material/Subway';
import TramIcon from '@mui/icons-material/Tram';
import TrainIcon from '@mui/icons-material/Train';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import ChevronRight from '@mui/icons-material/ChevronRight';
import type { Stop, Agency } from '../api/types';
import { onColor } from '../lib/gtfs';
import { distTxt } from '../lib/geo';
import { agencyNamesFor } from '../lib/agencyNames';
import { useRoutesAtStop } from '../api/queries';
import { BadgeRow } from './RouteBadge';

const ICONS: Record<number, typeof PlaceIcon> = {
  1: SubwayIcon, 2: TrainIcon, 3: DirectionsBusIcon, 4: DirectionsBoatIcon, 11: DirectionsBusIcon
};

// Fila de parada compartida entre Home ("Cerca de ti") y el detalle de parada (estaciones cercanas).
// Abajo del nombre: agencia (texto) a la izquierda, ruta(s) (recuadro/chip) a la derecha.
// Rutas: primero mira usePatternIndex (gratis, ya cacheado); si esa parada todavía no
// quedó indexada por ninguna ruta prefetcheada/visitada, cae a GET /RoutesByStop.
export default function StopRow({
  stop, dist, agencies, onClick
}: { stop: Stop; dist?: number; agencies: Agency[]; onClick: () => void }) {
  const { routes, isLoading } = useRoutesAtStop(stop.id);
  const agencyNames = agencyNamesFor(routes, agencies);

  const lead = routes[0];
  const Icon = lead ? (ICONS[lead.type] || TramIcon) : PlaceIcon;
  const d = dist ?? stop.dist;
  return (
    <ListItemButton onClick={onClick} sx={{ gap: 2, alignItems: 'flex-start', minHeight: 64, py: 1.25 }}>
      <Avatar sx={{ bgcolor: lead ? lead.color : 'action.hover', color: lead ? onColor(lead.color) : 'text.secondary', mt: 0.25 }}>
        <Icon fontSize="small" />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap fontWeight={500}>
          {stop.name}{d != null ? <Typography component="span" variant="body2" color="text.secondary"> · {distTxt(d)}</Typography> : null}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {agencyNames.length ? agencyNames.slice(0, 2).join(' · ') : isLoading ? '…' : '—'}
          </Typography>
          {routes.length ? <BadgeRow routes={routes} /> : <ChevronRight color="disabled" fontSize="small" />}
        </Box>
      </Box>
    </ListItemButton>
  );
}
