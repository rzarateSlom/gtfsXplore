# Visor GTFS

Visor de rutas, paradas y horarios sobre **GtfsExposeAPI** (GeneXus). React + Vite + MUI
(Emotion) + TanStack Query + Zustand + MapLibre GL, instalable como PWA.

## Poner en marcha (dev)

```bash
npm install
cp .env.example .env      # ajustá VITE_API_BASE si no usás el proxy de dev
npm run dev
```

El dev server corre por **HTTPS con certificado autofirmado** (`@vitejs/plugin-basic-ssl`) —
hace falta para que el navegador habilite geolocalización y el service worker de la PWA.
La primera vez el navegador va a mostrar una advertencia de certificado no confiable:
"Avanzado" → "Continuar". Para probar desde el celular en la misma red, entrá a la IP LAN
que imprime `vite` (`https://192.168.x.x:5173`) y aceptá la misma advertencia ahí también.

## Qué trae

- **`src/api/`** — cliente HTTP (`client.ts`: resuelve el feed activo solo vía
  `GET /ActiveFeedVersion` y lo cachea, con el mismo diagnóstico de CORS/mixed-content de
  la demo original), tipos del contrato OpenAPI (`types.ts`) y los hooks de TanStack Query
  (`queries.ts`): `useAgencies`, `useRoutes`, `useStops`, `useStopsNearby`, `useStopsByName`,
  `useCalendar`, `useActiveServices`, `useRouteDetail`, `useRoutesAtStop`, `useRoutesByStop`,
  `useShapes`, `usePrefetchRoutes`.
- **`src/store/`** — Zustand: `useAppStore` (tab/vista/pila de navegación, agencia
  elegida/favorita, tema; sincroniza `history.pushState`/`popstate` para que el botón/gesto
  de atrás del dispositivo haga lo mismo que "Volver" en la app) y `usePatternIndex` (índice
  stopId → rutas; distingue lista **parcial** — de paso, al cargar el detalle de una ruta
  visitada — de lista **completa** — confirmada vía `/RoutesByStop` — para no perder rutas
  de una parada que fue tocada solo de pasada por otra).
- **`src/lib/useGeolocation.ts`** — pide la ubicación del navegador, la refresca sola cada
  10 minutos (o al volver a entrar a Home) mientras la pantalla esté activa, y recuerda un
  rechazo previo para no re-molestar en cada visita.
- **`src/map/MapView.tsx`** — wrapper imperativo de MapLibre GL con tiles raster de CARTO;
  expone `setRouteLine`, `setStopMarkers`, `setPin`, `setUserLocation`, `fitBounds`, `clear`
  y un callback `onReady` (evita perder el dibujo cuando React 18 StrictMode remonta el mapa
  dos veces en dev).
- **`src/screens/`**
  - **Home** — "Cerca de ti" con paradas reales alrededor de tu ubicación (`/StopsNearby`,
    radio 2 km) con botón "Obtener" para forzar el refresco, más buscador por nombre.
  - **Rutas** — combo de agencia + favorita (persistida), lista ordenada por
    `route_short_name` (orden natural).
  - **Detalle de ruta** — paradas con nombre real en línea de tiempo (viñeta + conector
    vertical) o en mapa (marcador real por parada + trazado, shape real si existe o las
    paradas unidas en orden si no), tabs de servicio por sentido.
  - **Detalle de parada** — carrusel horizontal de rutas que la sirven (número, nombre,
    agencia) y mapa con la parada + tu ubicación.
  - **Conexión/error** — se muestra sola cuando alguna consulta falla, con diagnóstico
    (CORS, mixed-content, servicio caído) y pasos para resolverlo.
- **`src/theme/theme.ts`** — tema MUI claro/oscuro.

## PWA

`vite-plugin-pwa` genera el manifest y el service worker (Workbox). Estrategia de caché:
shell de la app (JS/CSS/HTML) precacheado; llamadas a `GtfsExposeAPI` con **network-first**
(prioriza datos frescos, muestra el último dato conocido sin conexión); tiles del mapa
(CartoDB) con **cache-first**. Íconos genéricos en `public/icons/` (mismo motivo del pin que
usa `MapView`). `devOptions.enabled: true` para poder probar el prompt de instalación ya en
`npm run dev`.

## CORS y producción

En dev, `vite.config.ts` trae un proxy `/gtfs` → el sandbox, para no depender de que el
backend tenga CORS habilitado. **La API del sandbox no tiene CORS habilitado** (confirmado),
así que en producción se resuelve igual: `server.js` es un Express chico que sirve el build
(`dist/`) y reenvía `/gtfs/*` a la API real — el navegador solo habla con el propio dominio
de producción, sin depender de configuración del backend.

Deploy pensado para **Railway**:

```bash
npm run build   # tsc -b && vite build
npm start       # node server.js — Railway lo corre solo tras el build
```

Railway inyecta `PORT` solo. Variables de entorno relevantes:

| Variable | Dónde aplica | Detalle |
|---|---|---|
| `VITE_API_BASE` | build (Vite) | `.env.production` ya trae `/gtfs/GtfsExposeAPI` — no hace falta tocarlo en Railway |
| `VITE_API_GUID` | build (Vite) | dejar vacío: el feed activo se resuelve solo vía `/ActiveFeedVersion` |
| `API_TARGET` | runtime (`server.js`) | opcional; por defecto apunta al sandbox actual |

Si en el futuro el backend habilita CORS, se puede saltar `server.js` y apuntar
`VITE_API_BASE` directo a la URL pública de la API (sitio 100% estático).

## Pendiente / conocido

1. **React Router.** El estado de navegación vive en Zustand (con su propio historial
   sincronizado a mano), no en la URL — no hay deep-linking a una ruta o parada puntual por
   link directo. Migrar a `react-router-dom` es directo dado que el árbol de pantallas ya
   está separado por vista.
2. **Tests.** No hay suite todavía; los candidatos obvios son `queries.ts` (parseo de
   `stop_times`, cálculo de `activeServices`) y `usePatternIndex`.
3. **Bundle grande** (~1.3 MB sin comprimir, MapLibre GL + MUI). Candidato a code-splitting
   con `import()` dinámico si el tiempo de carga inicial importa.
4. **`@mui/icons-material`** no trae ícono de teleférico — `CableCar` está mapeado pero
   confirmá que tu versión instalada lo incluye; si no, cae a `Tram`.
5. **Calidad de datos del feed activo**: se observaron filas duplicadas en `/Stop` y
   `/StopsNearby` (mitigado en el cliente con `dedupeById`, ver `lib/gtfs.ts`) — vale la pena
   revisarlo del lado del backend si se nota en otros endpoints.
