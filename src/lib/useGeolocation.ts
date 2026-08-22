import { useCallback, useEffect, useRef, useState } from 'react';

export type GeoStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unsupported' | 'error';
export interface GeoState {
  lat: number | null; lon: number | null; accuracy: number | null;
  status: GeoStatus; error: string | null; updatedAt: number | null;
}

const PERM_KEY = 'gtfsviewer.geoPermission';
const REFRESH_MS = 10 * 60_000; // cada cuánto se vuelve a pedir la posición mientras la pantalla está activa

function loadPersistedDenial(): boolean {
  try { return localStorage.getItem(PERM_KEY) === 'denied'; } catch { return false; }
}
function persistPermission(v: 'granted' | 'denied') {
  try { localStorage.setItem(PERM_KEY, v); } catch {}
}

// Pide la ubicación del navegador al montar (o sea, cada vez que se entra a la pantalla
// que usa este hook) y la refresca sola cada REFRESH_MS mientras siga montada. refresh()
// permite forzarla a demanda (botón "Obtener"). Recuerda un rechazo previo para no
// re-molestar en cada visita; el permiso real lo sigue gobernando el navegador (retry()
// limpia esa marca y reintenta desde cero).
export function useGeolocation() {
  const [state, setState] = useState<GeoState>(() => ({
    lat: null, lon: null, accuracy: null, error: null, updatedAt: null,
    status: !navigator.geolocation ? 'unsupported' : loadPersistedDenial() ? 'denied' : 'idle'
  }));
  const timerRef = useRef<number | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation || document.visibilityState === 'hidden') return;
    setState((s) => ({ ...s, status: s.lat != null ? s.status : 'locating' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persistPermission('granted');
        setState({
          lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy,
          status: 'granted', error: null, updatedAt: Date.now()
        });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        if (denied) persistPermission('denied');
        setState((s) => ({ ...s, status: denied ? 'denied' : 'error', error: err.message }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: REFRESH_MS - 5000 }
    );
  }, []);

  const stopped = state.status === 'unsupported' || state.status === 'denied';
  useEffect(() => {
    if (stopped) return;
    locate();
    timerRef.current = window.setInterval(locate, REFRESH_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [stopped, locate]);

  const retry = useCallback(() => {
    try { localStorage.removeItem(PERM_KEY); } catch {}
    setState((s) => ({ ...s, status: 'idle', error: null }));
  }, []);

  return { ...state, retry, refresh: locate };
}
