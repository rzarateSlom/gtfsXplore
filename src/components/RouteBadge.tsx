import { Box, Chip } from '@mui/material';
import type { RouteN } from '../api/types';
import { onColor } from '../lib/gtfs';

export default function RouteBadge({ route, small }: { route: RouteN; small?: boolean }) {
  return (
    <Chip
      label={route.short}
      size={small ? 'small' : 'medium'}
      sx={{
        bgcolor: route.color, color: onColor(route.color), fontWeight: 600,
        borderRadius: 1, minWidth: small ? 32 : 40
      }}
    />
  );
}

export function BadgeOverflow({ count }: { count: number }) {
  return <Chip label={`+${count}`} size="small" sx={{ borderRadius: 1 }} />;
}

export function BadgeRow({ routes }: { routes: RouteN[] }) {
  if (!routes.length) return null;
  const shown = routes.slice(0, 2);
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
      {shown.map((r) => <RouteBadge key={r.id} route={r} small />)}
      {routes.length > 2 && <BadgeOverflow count={routes.length - 2} />}
    </Box>
  );
}
