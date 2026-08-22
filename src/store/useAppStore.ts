import { create } from 'zustand';

export type Tab = 'home' | 'routes';
export type View = 'home' | 'route' | 'stop';

interface NavSnapshot {
  view: View; tab: Tab; routeId: string | null; routeTab: 'paradas' | 'servicio';
  routeParadasMode: 'list' | 'map'; dir: 0 | 1; stopId: string | null;
}

interface AppState extends NavSnapshot {
  query: string;
  agency: string;
  themeMode: 'light' | 'dark';
  navStack: NavSnapshot[];
  toggleTheme: () => void;
  setQuery: (q: string) => void;
  setAgency: (id: string) => void;
  goTab: (tab: Tab) => void;
  navToRoute: (routeId: string, dir?: 0 | 1) => void;
  navToStop: (stopId: string) => void;
  setRouteTab: (t: 'paradas' | 'servicio') => void;
  setDir: (d: 0 | 1) => void;
  toggleRouteMap: () => void;
  back: () => void;
}

const FAV_KEY = 'gtfsviewer.favAgency';
const THEME_KEY = 'gtfsviewer.theme';
export const loadFavAgency = () => { try { return localStorage.getItem(FAV_KEY) || ''; } catch { return ''; } };
export const saveFavAgency = (id: string) => { try { id ? localStorage.setItem(FAV_KEY, id) : localStorage.removeItem(FAV_KEY); } catch {} };

function snapshot(s: AppState): NavSnapshot {
  return { view: s.view, tab: s.tab, routeId: s.routeId, routeTab: s.routeTab, routeParadasMode: s.routeParadasMode, dir: s.dir, stopId: s.stopId };
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'home', tab: 'home', routeId: null, routeTab: 'paradas', routeParadasMode: 'list', dir: 0, stopId: null,
  query: '', agency: loadFavAgency(),
  themeMode: (() => {
    try { const saved = localStorage.getItem(THEME_KEY); if (saved === 'light' || saved === 'dark') return saved; } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })(),
  navStack: [],

  toggleTheme: () => set((s) => {
    const mode = s.themeMode === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, mode); } catch {}
    return { themeMode: mode };
  }),
  setQuery: (q) => set({ query: q }),
  setAgency: (id) => set({ agency: id }),
  goTab: (tab) => set({ tab, view: 'home', routeId: null, stopId: null, query: '', navStack: [] }),

  navToRoute: (routeId, dir = 0) => set((s) => {
    // Desde Home/Rutas arranca una pila nueva; desde una ruta a otra, se pisa (son "hermanas");
    // desde cualquier otro lado (p.ej. parada) se apila, así "volver" regresa ahí.
    const stack =
      s.view === 'home' ? [snapshot(s)] :
      s.view === 'route' ? (s.navStack.length > 1 ? [s.navStack[0]] : s.navStack) :
      [...s.navStack, snapshot(s)];
    return { navStack: stack, view: 'route', routeId, routeTab: 'paradas', routeParadasMode: 'list', dir };
  }),
  navToStop: (stopId) => set((s) => {
    const stack = s.view === 'home' ? [] : [...s.navStack, snapshot(s)];
    return { navStack: stack, view: 'stop', stopId };
  }),
  setRouteTab: (t) => set({ routeTab: t }),
  setDir: (d) => set({ dir: d }),
  toggleRouteMap: () => set((s) => ({ routeParadasMode: s.routeParadasMode === 'map' ? 'list' : 'map' })),
  back: () => set((s) => {
    const prev = s.navStack[s.navStack.length - 1];
    if (!prev) return { view: 'home', routeId: null, stopId: null };
    return { ...prev, navStack: s.navStack.slice(0, -1) };
  })
}));
