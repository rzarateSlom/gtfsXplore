import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const TILES = {
  light: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
};
const ATTR = '© OpenStreetMap contributors · © CARTO';

function styleFor(mode: 'light' | 'dark'): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: { basemap: { type: 'raster', tiles: [TILES[mode]], tileSize: 256, attribution: ATTR } },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }]
  };
}

export interface StopMarkerSpec { id: string; lat: number; lon: number; color: string; onClick: (id: string) => void; radius?: number; }

export interface MapViewHandle {
  setRouteLine: (coords: [number, number][], color: string) => void;
  setStopMarkers: (markers: StopMarkerSpec[]) => void;
  setPin: (lat: number, lon: number) => void;
  setUserLocation: (lat: number, lon: number) => void;
  fitBounds: (coords: [number, number][], padding?: number) => void;
  clear: () => void;
}

// Envoltorio imperativo de MapLibre — el equivalente de los L.layerGroup de la demo,
// como capas GeoJSON (líneas + círculos) en vez de manipular el DOM directamente.
//
// onReady: React 18 StrictMode monta este efecto dos veces en dev (crea el mapa, lo
// destruye, lo vuelve a crear) para detectar cleanups faltantes. Si el padre dibuja
// (setStopMarkers/setRouteLine) en un efecto propio de UNA sola pasada, corre el riesgo
// de apuntar a la instancia vieja que termina destruida. onReady avisa cada vez que HAY
// una instancia lista de verdad (tras su evento 'load'), para que el padre pueda enganchar
// su propio dibujo a esa señal en vez de a un montaje que no siempre sobrevive.
const MapView = forwardRef<MapViewHandle, { mode: 'light' | 'dark'; onReady?: () => void }>(function MapView({ mode, onReady }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pinRef = useRef<Marker | null>(null);
  const userRef = useRef<Marker | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: styleFor(mode), center: [-99.15, 19.42], zoom: 11 });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'route-halo', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      onReadyRef.current?.();
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) map.setStyle(styleFor(mode));
  }, [mode]);

  useImperativeHandle(ref, () => ({
    setRouteLine(coords, color) {
      const map = mapRef.current; if (!map) return;
      const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'Feature', properties: { color }, geometry: { type: 'LineString', coordinates: coords.map(([lat, lon]) => [lon, lat]) } } as any);
    },
    setStopMarkers(specs) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = specs.map((s) => {
        const el = document.createElement('div');
        el.style.width = `${(s.radius ?? 6) * 2}px`;
        el.style.height = `${(s.radius ?? 6) * 2}px`;
        el.style.borderRadius = '50%';
        el.style.background = s.color;
        el.style.border = '2px solid #fff';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,.4)';
        el.addEventListener('click', () => s.onClick(s.id));
        const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lon, s.lat]);
        if (mapRef.current) marker.addTo(mapRef.current);
        return marker;
      });
    },
    setPin(lat, lon) {
      pinRef.current?.remove();
      const el = document.createElement('div');
      el.innerHTML = `<svg width="30" height="40" viewBox="0 0 30 40" fill="none">
        <path d="M15 39C15 39 28 24.5 28 14.5A13 13 0 1 0 2 14.5C2 24.5 15 39 15 39Z" fill="#1976d2" stroke="#fff" stroke-width="2.5"/>
        <circle cx="15" cy="14.5" r="4.6" fill="#fff"/></svg>`;
      pinRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lon, lat]);
      if (mapRef.current) pinRef.current.addTo(mapRef.current);
    },
    setUserLocation(lat, lon) {
      userRef.current?.remove();
      const el = document.createElement('div');
      el.style.width = '16px'; el.style.height = '16px'; el.style.borderRadius = '50%';
      el.style.background = '#1976d2'; el.style.border = '3px solid #fff';
      el.style.boxShadow = '0 0 0 5px rgba(25,118,210,0.28), 0 1px 4px rgba(0,0,0,.4)';
      userRef.current = new maplibregl.Marker({ element: el }).setLngLat([lon, lat]);
      if (mapRef.current) userRef.current.addTo(mapRef.current);
    },
    fitBounds(coords, padding = 60) {
      const map = mapRef.current; if (!map || !coords.length) return;
      if (coords.length === 1) { map.setCenter([coords[0][1], coords[0][0]]); map.setZoom(15); return; }
      const bounds = coords.reduce(
        (b, [lat, lon]) => b.extend([lon, lat]),
        new maplibregl.LngLatBounds([coords[0][1], coords[0][0]], [coords[0][1], coords[0][0]])
      );
      map.fitBounds(bounds, { padding, animate: false });
    },
    clear() {
      markersRef.current.forEach((m) => m.remove()); markersRef.current = [];
      pinRef.current?.remove(); pinRef.current = null;
      userRef.current?.remove(); userRef.current = null;
      const map = mapRef.current;
      const src = map?.getSource('route') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] } as any);
    }
  }), []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
});

export default MapView;
