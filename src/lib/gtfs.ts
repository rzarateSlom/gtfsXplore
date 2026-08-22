export const ROUTE_TYPES: Record<number, string> = {
  0: 'Tranvía', 1: 'Metro', 2: 'Tren', 3: 'Autobús', 4: 'Ferry',
  5: 'Cable', 6: 'Teleférico', 7: 'Funicular', 11: 'Trolebús', 12: 'Monorriel'
};

// Nombre de icono de @mui/icons-material por route_type (GTFS extended).
export const MODE_ICON_NAME: Record<number, string> = {
  0: 'Tram', 1: 'Subway', 2: 'Train', 3: 'DirectionsBus', 4: 'DirectionsBoat',
  5: 'Tram', 6: 'CableCar' /* fallback: Tram si tu versión de MUI no lo trae */,
  7: 'Tram', 11: 'DirectionsBus', 12: 'Tram'
};

const FALLBACK_COLORS = ['#29E584', '#0F8B96', '#BFD732', '#4FD9C7', '#E5A32B', '#00A0DF', '#F04E98', '#8AA018'];

export function hexOrFallback(c: string | undefined, i: number) {
  if (!c) return FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  const v = c.trim().replace(/^#/, '');
  return /^[0-9a-f]{6}$/i.test(v) ? `#${v}` : FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

// Contraste AA: cruce matemático real luminancia↔blanco/negro (no 0.5, no 0.35).
export function onColor(hex: string): string {
  const v = hex.replace('#', '');
  const f = (i: number) => {
    const c = parseInt(v.substr(i, 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
  return lum > 0.179 ? 'rgba(0,0,0,0.87)' : '#ffffff';
}

export function fmt(minutes: number) {
  const t = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// La API duplica filas en /Stop y /StopsNearby (join que multiplica registros del lado del backend).
export function dedupeById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

export function dateOnly(s?: string) { return (s || '').slice(0, 10); }

export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
