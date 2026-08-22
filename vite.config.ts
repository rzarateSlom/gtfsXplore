import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// Dev-only proxy: lets `npm run dev` talk to the API same-origin,
// sidestepping CORS while the backend team finishes their config.
// Point VITE_API_BASE at '/gtfs' in dev and set the real target below.
//
// basicSsl(): geolocation (y otras APIs sensibles) sólo funcionan en "contexto
// seguro" — https o localhost. Al entrar desde un celular por IP de LAN (http://192.168.x.x)
// el navegador la bloquea sola; este plugin sirve el dev server por HTTPS con un
// certificado autofirmado. El navegador va a mostrar una advertencia de certificado
// no confiable la primera vez — hay que aceptarla ("Avanzado" → "Continuar").
export default defineConfig({
  define: {
    // Versión mostrada en la UI (AppShell) — se maneja bumpeando "version" en package.json.
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true }, // permite probar el install prompt/SW ya en `npm run dev`
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Visor GTFS',
        short_name: 'GTFS Xplore',
        description: 'Visor de rutas, paradas y horarios GTFS.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell (JS/CSS/HTML) precacheado por Workbox vía globPatterns default.
        runtimeCaching: [
          {
            // GtfsExposeAPI, sea vía el proxy /gtfs en dev o el host real en prod.
            urlPattern: ({ url }) => url.pathname.includes('/GtfsExposeAPI/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gtfs-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) => /basemaps\.cartocdn\.com$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    proxy: {
      '/gtfs': {
        target: 'https://sandbox10.gxapps.cloud/Idfe29b64088e003f406278efeca1a363c',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gtfs/, '')
      }
    }
  }
});
