# Visor GTFS — esqueleto React

Puerto React del visor de demostración (`Visor GTFS Material.html` en la raíz del proyecto),
sobre React + Vite + MUI (Emotion) + TanStack Query + Zustand + MapLibre GL.

## Poner en marcha

```bash
npm install
cp .env.example .env      # ajustá VITE_API_BASE si no usás el proxy de dev
npm run dev
```

## Qué trae

- **`src/api/`** — cliente HTTP (`client.ts`, con el mismo diagnóstico de CORS/mixed-content
  de la demo), tipos del contrato OpenAPI (`types.ts`) y los hooks de TanStack Query
  (`queries.ts`): `useAgencies`, `useRoutes`, `useStops`, `useCalendar`, `useActiveServices`,
  `useRouteDetail`, `useShapes`, `usePrefetchRoutes`, `useStopsByName`.
- **`src/store/`** — Zustand: `useAppStore` (tab/vista/pila de navegación, agencia elegida,
  tema) y `usePatternIndex` (índice stopId → rutas, poblado al vuelo por `useRouteDetail`;
  reemplaza a `/RoutesByStop` con datos ya cacheados).
- **`src/map/MapView.tsx`** — wrapper imperativo de MapLibre GL con tiles raster de CARTO
  (igual que la demo); expone `setRouteLine`, `setStopMarkers`, `setPin`, `fitBounds`.
- **`src/screens/`** — Home (cerca de ti + buscador), Rutas (combo de agencia + favorita),
  Detalle de ruta (paradas lista/mapa, servicio), Detalle de parada (mapa 70% + lista 30%),
  Conexión/error.
- **`src/theme/theme.ts`** — tema MUI claro/oscuro con los mismos valores que la demo.

## Lo que falta para producción (a propósito, para no inflar el esqueleto)

1. **Coordenadas de paradas en el patrón de una ruta.** `useRouteDetail` devuelve
   `pattern: {stopId, seq, offset}[]` sin lat/lon — hay que resolver cada `stopId` contra el
   cache de `useStops()` (un `Map` por id alcanza) antes de dibujar la línea+paradas de la
   ruta en el mapa. Dejé el punto marcado con un comentario en `RouteDetailScreen.tsx`.
2. **Trazado real vs. secuencia de paradas.** Como en la demo, `ShapeId` puede no traer
   geometría — el fallback es usar las coordenadas de las paradas en orden.
3. **React Router.** El estado de navegación vive en Zustand, no en la URL (igual que la
   demo). Para deep-linking / back del navegador, migrar `useAppStore`'s view/tab/routeId a
   rutas de `react-router-dom` es directo — el árbol de pantallas ya está separado por vista.
4. **Tests.** No hay suite todavía; los candidatos obvios son `queries.ts` (parseo de
   `stop_times`, cálculo de `activeServices`) y `usePatternIndex`.
5. **`@mui/icons-material`** no trae ícono de teleférico — `CableCar` está mapeado pero
   confirmá que tu versión instalada lo incluye; si no, cae a `Tram`.

## CORS

`vite.config.ts` trae un proxy `/gtfs` → el sandbox público, para desarrollar sin depender de
que el backend ya tenga CORS habilitado. En producción, con `CorsFilter` mapeado a `/rest/*`
(Java) o `CORS Allowed Origins` en el objeto REST (GeneXus .NET), `VITE_API_BASE` apunta
directo a la API.
