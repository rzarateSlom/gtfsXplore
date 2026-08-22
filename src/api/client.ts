// Cliente HTTP + diagnóstico de fallas de red (misma lógica que la demo).

export const CFG = {
  base: (import.meta.env.VITE_API_BASE as string) || '',
  guid: (import.meta.env.VITE_API_GUID as string) || '' // override manual opcional
};

// El feed activo se resuelve una sola vez contra /ActiveFeedVersion y se cachea acá;
// VITE_API_GUID (si está seteado) tiene prioridad y salta esa llamada.
let resolvedGuid: string | null = CFG.guid || null;
let resolving: Promise<string> | null = null;

function rawUrl(path: string, params?: Record<string, string | number | undefined>) {
  const base = CFG.base.replace(/\/+$/, '');
  const u = new URL(base + path, window.location.href);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  return u;
}

async function ensureGuid(): Promise<string> {
  if (resolvedGuid) return resolvedGuid;
  if (!resolving) {
    resolving = (async () => {
      const res = await fetch(rawUrl('/ActiveFeedVersion').toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`La API respondió HTTP ${res.status} en /ActiveFeedVersion`);
      const json = await res.json();
      if (!json?.Success || !json.ActiveGtfsFeedVersionGuid) {
        throw new Error(json?.ErrorMessage || 'No se pudo resolver el feed activo (/ActiveFeedVersion).');
      }
      resolvedGuid = json.ActiveGtfsFeedVersionGuid as string;
      return resolvedGuid;
    })().finally(() => { resolving = null; });
  }
  return resolving;
}

export function apiUrl(path: string, params?: Record<string, string | number | undefined>, guid?: string) {
  const u = rawUrl(path, params);
  if (guid) u.searchParams.set('Gtfsfeedversionguid', guid);
  return u.toString();
}

export type DiagCause = 'mixed' | 'local' | 'cors' | null;
export interface Diag { msg: string; cause: DiagCause; host?: string; }

export function diagnose(err: Error, path: string): Diag {
  const isNetwork = err instanceof TypeError || /failed to fetch|load failed|networkerror/i.test(err.message || '');
  if (!isNetwork) return { msg: err.message, cause: null };
  let host = '';
  try { host = new URL(apiUrl(path, {})).host; } catch {}
  const pageHttps = window.location.protocol === 'https:';
  const apiHttp = /^http:/i.test(CFG.base || '');
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(host);
  if (pageHttps && apiHttp) return { msg: 'El navegador bloqueó la llamada: esta página corre en HTTPS y la API en HTTP.', cause: 'mixed', host };
  if (local) return { msg: `Sin respuesta de ${host}.`, cause: 'local', host };
  return { msg: `No se pudo alcanzar ${host || 'la API'}.`, cause: 'cors', host };
}

export class ApiError extends Error {
  diag: Diag;
  constructor(diag: Diag) { super(diag.msg); this.diag = diag; }
}

export async function apiGet<T = any>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 9000);
  try {
    const guid = path === '/ActiveFeedVersion' ? undefined : await ensureGuid();
    const res = await fetch(apiUrl(path, params, guid), { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`La API respondió HTTP ${res.status} en ${path}`);
    const json = await res.json();
    if (json && json.Success === false) throw new Error(json.ErrorMessages || json.ErrorMessage || `La API respondió Success=false en ${path}`);
    return json as T;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new ApiError({ msg: `Tiempo de espera agotado (9 s) en ${path}`, cause: null });
    throw new ApiError(diagnose(err as Error, path));
  } finally { clearTimeout(timer); }
}

// Instrucciones concretas según la causa detectada — mostradas en ConnectionErrorPanel.
export const FIXES: Record<Exclude<DiagCause, null>, [string, string][]> = {
  mixed: [
    ['Servir el visor por HTTP', 'Abrí la app desde el mismo servidor GeneXus, o desde un http://localhost. Los navegadores no permiten que una página HTTPS lea una API HTTP.'],
    ['O exponer la API por HTTPS', 'Publicá GtfsExposeAPI detrás de TLS y actualizá VITE_API_BASE a https://…']
  ],
  local: [
    ['Verificar que el servicio está arriba', 'Abrí la base URL en una pestaña nueva. Si no responde, levantá el servidor GeneXus.'],
    ['Habilitar CORS', 'GtfsExposeAPI debe devolver Access-Control-Allow-Origin para el origen de esta app. En GeneXus: propiedad CORS Allowed Origins del objeto REST.'],
    ['Confirmar el puerto', 'El puerto por defecto del modelo .NET SQL Server no siempre es 8082.']
  ],
  cors: [
    ['Habilitar CORS en GtfsExposeAPI', 'Backend Java: agregá el CorsFilter de Tomcat mapeado a /rest/* en web.xml. Backend .NET: propiedad CORS Allowed Origins del objeto REST.'],
    ['Origen a autorizar', window.location.origin],
    ['O usar el proxy de desarrollo', 'vite.config.ts ya trae un proxy /gtfs → el sandbox, para trabajar sin CORS en dev.']
  ]
};
