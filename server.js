// Servidor de producción: sirve el build estático (dist/) y reenvía /gtfs/* a la API
// real de GtfsExposeAPI — mismo rol que el proxy de vite.config.ts en dev, pero para
// producción. Evita depender de que el backend GeneXus tenga CORS habilitado: el
// navegador solo habla con este mismo origen.
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const API_TARGET = process.env.API_TARGET || 'https://sandbox10.gxapps.cloud/Idfe29b64088e003f406278efeca1a363c';

app.use('/gtfs', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  pathRewrite: { '^/gtfs': '' }
}));

app.use(express.static(path.join(__dirname, 'dist')));

// Fallback de SPA (no hay react-router todavía, pero cubre refrescos de página en cualquier ruta).
// Express 5 ya no acepta '*' como path de ruta; un middleware sin path hace de catch-all.
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`gtfs-viewer listening on :${PORT} → proxying /gtfs to ${API_TARGET}`));
