export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLon = (b.lon - a.lon) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function distTxt(m: number) {
  return m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function nearbyStops<T extends { id: string; lat: number; lon: number }>(stop: T, list: T[], km: number) {
  const R = km * 1000;
  return list
    .filter((x) => x.id !== stop.id)
    .map((x) => ({ ...x, d: haversine(stop, x) }))
    .filter((x) => x.d <= R)
    .sort((a, b) => a.d - b.d);
}
