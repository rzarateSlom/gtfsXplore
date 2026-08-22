import { create } from 'zustand';
import type { RouteN } from '../api/types';

// Índice stopId -> rutas que la sirven. Dos formas de llenarlo:
// - index(): parcial, de paso, a medida que se cargan los RouteDetail de rutas visitadas
//   (esa ruta pasa por estas paradas, pero puede no ser TODAS las rutas de esas paradas).
// - indexComplete(): la lista completa de una parada puntual, vía GET /RoutesByStop.
// `complete` distingue ambos casos: sin eso, una parada nunca visitada directamente pero
// tocada de paso por una sola ruta indexada quedaría con esa única ruta como si fuera todo
// su servicio, "perdiendo" el resto la próxima vez que se muestra.
interface PatternIndexState {
  byStop: Map<string, RouteN[]>;
  complete: Set<string>;
  index: (stopIds: string[], route: RouteN) => void;
  indexComplete: (stopId: string, routes: RouteN[]) => void;
  routesAt: (stopId: string) => RouteN[];
  isComplete: (stopId: string) => boolean;
}

export const usePatternIndex = create<PatternIndexState>((set, get) => ({
  byStop: new Map(),
  complete: new Set(),
  index: (stopIds, route) => {
    const byStop = get().byStop;
    stopIds.forEach((id) => {
      const cur = byStop.get(id) || [];
      if (!cur.some((r) => r.id === route.id)) byStop.set(id, [...cur, route]);
    });
    set({ byStop: new Map(byStop) });
  },
  indexComplete: (stopId, routes) => {
    const byStop = new Map(get().byStop);
    byStop.set(stopId, routes);
    const complete = new Set(get().complete);
    complete.add(stopId);
    set({ byStop, complete });
  },
  routesAt: (stopId) => get().byStop.get(stopId) || [],
  isComplete: (stopId) => get().complete.has(stopId)
}));
