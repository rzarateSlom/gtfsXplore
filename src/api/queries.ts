import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { apiGet } from './client';
import { usePatternIndex } from '../store/usePatternIndex';
import { hexOrFallback, ROUTE_TYPES, dateOnly, ymd, dedupeById } from '../lib/gtfs';
import { haversine } from '../lib/geo';
import type {
  FeedVersionDTO, AgencyDTO, RouteDTO, StopDTO, StopNearbyDTO, CalendarDTO, CalendarDateDTO,
  TripDTO, StopTimeDTO, ShapePointDTO, Agency, Stop, RouteN, Calendar, CalendarException,
  RouteDetail, RouteDirection
} from './types';

const NOW = new Date();
export const TODAY = ymd(NOW);
export const nowMin = NOW.getHours() * 60 + NOW.getMinutes();

// Los tiempos GTFS llegan como entero; puede ser segundos o minutos tras medianoche.
let TIME_UNIT = 60;
function toMinutes(v?: number) { return (v || 0) / TIME_UNIT; }
function detectUnit(sts: StopTimeDTO[]) {
  let max = 0;
  for (const st of sts) { const v = st.StopTimeDepartureTime || st.StopTimeArrivalTime || 0; if (v > max) max = v; }
  TIME_UNIT = max > 3000 ? 60 : 1;
}

export function useFeedVersion() {
  return useQuery({ queryKey: ['feedVersion'], queryFn: () => apiGet<FeedVersionDTO>('/FeedVersion') });
}

export function useAgencies() {
  return useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const out = await apiGet<{ AgencyData: AgencyDTO[] }>('/Agency');
      return (out.AgencyData || []).map((a): Agency => ({ id: a.AgencyId, name: a.AgencyName || a.AgencyId, url: a.AgencyUrl }));
    }
  });
}

function toRouteN(list: RouteDTO[]): RouteN[] {
  return list.map((r, i): RouteN => ({
    id: r.RouteId, agencyId: r.AgencyId, short: r.RouteShortName || r.RouteId, long: r.RouteLongName || r.RouteShortName || r.RouteId,
    type: r.RouteType, typeName: ROUTE_TYPES[r.RouteType] || 'Servicio',
    color: hexOrFallback(r.RouteColor, i), text: hexOrFallback(r.RouteTextColor, 0), sort: r.RouteSortOrder ?? i
  })).sort((a, b) => a.sort - b.sort);
}

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const out = await apiGet<{ RouteData: RouteDTO[] }>('/Route');
      return toRouteN(out.RouteData || []);
    }
  });
}

// Respaldo de GET /RoutesByStop para paradas que usePatternIndex todavía no indexó
// (o sea, que no forman parte de ninguna ruta ya prefetcheada/visitada).
export function useRoutesByStop(stopId: string | null) {
  return useQuery({
    queryKey: ['routesByStop', stopId],
    enabled: !!stopId,
    queryFn: async () => {
      const out = await apiGet<{ RouteData: RouteDTO[] }>('/RoutesByStop', { Stopid: stopId! });
      return toRouteN(out.RouteData || []);
    },
    staleTime: 5 * 60_000
  });
}

// Rutas que sirven una parada: primero usePatternIndex si esa parada ya tiene su lista
// COMPLETA (gratis); si no, cae a GET /RoutesByStop y, al resolver, marca esa parada como
// completa en el índice — así una parada tocada de paso por una sola ruta visitada no
// "pisa" el resto de sus rutas la próxima vez que se muestra.
export function useRoutesAtStop(stopId: string | null) {
  const isComplete = usePatternIndex((s) => s.isComplete)(stopId || '');
  const indexed = usePatternIndex((s) => s.routesAt)(stopId || '');
  const indexComplete = usePatternIndex((s) => s.indexComplete);
  const fallbackQ = useRoutesByStop(isComplete ? null : stopId);
  useEffect(() => {
    if (stopId && fallbackQ.data) indexComplete(stopId, fallbackQ.data);
  }, [stopId, fallbackQ.data, indexComplete]);
  return { routes: isComplete ? indexed : (fallbackQ.data || indexed), isLoading: !isComplete && fallbackQ.isLoading };
}

// Centro del feed = promedio de todas las paradas; distancia de cada parada a ese punto.
export function useStops() {
  return useQuery({
    queryKey: ['stops'],
    queryFn: async () => {
      const out = await apiGet<{ StopData: StopDTO[] }>('/Stop');
      const list = dedupeById((out.StopData || [])
        .filter((s) => s.StopLat && s.StopLon)
        .map((s): Stop => ({
          id: s.StopId, code: s.StopCode, name: s.StopName || s.StopId,
          lat: +s.StopLat, lon: +s.StopLon, wheelchair: s.StopWheelchairBoarding
        })));
      if (!list.length) throw new Error('El feed no devolvió paradas con coordenadas.');
      const origin = {
        lat: list.reduce((a, s) => a + s.lat, 0) / list.length,
        lon: list.reduce((a, s) => a + s.lon, 0) / list.length
      };
      list.forEach((s) => { s.dist = haversine(origin, s); });
      return list;
    }
  });
}

export function useCalendar() {
  return useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const out = await apiGet<{ CalendarData: CalendarDTO[]; CalendarDatesData: CalendarDateDTO[] }>('/Calendar');
      const calendars = (out.CalendarData || []).map((c): Calendar => ({
        id: c.CalendarServiceId, raw: c, from: dateOnly(c.CalendarStartDate), to: dateOnly(c.CalendarEndDate),
        days: [c.CalendarMonday, c.CalendarTuesday, c.CalendarWednesday, c.CalendarThursday, c.CalendarFriday, c.CalendarSaturday, c.CalendarSunday].map(Boolean)
      }));
      const exceptions = (out.CalendarDatesData || []).map((d): CalendarException => ({
        serviceId: d.CalendarServiceId, date: dateOnly(d.CalendarDateDate), type: d.CalendarDateExceptionType
      }));
      return { calendars, exceptions };
    }
  });
}

// service_id activos hoy: calendar.txt filtrado por día de semana + calendar_dates.txt del día.
export function useActiveServices() {
  const cal = useCalendar();
  return useMemo(() => {
    const set = new Set<string>();
    if (!cal.data) return set;
    const dow = NOW.getDay();
    const flags: (keyof CalendarDTO)[] = ['CalendarSunday', 'CalendarMonday', 'CalendarTuesday', 'CalendarWednesday', 'CalendarThursday', 'CalendarFriday', 'CalendarSaturday'];
    cal.data.calendars.forEach((c) => {
      const inRange = (!c.from || c.from <= TODAY) && (!c.to || c.to >= TODAY);
      if (inRange && c.raw[flags[dow]]) set.add(c.id);
    });
    cal.data.exceptions.forEach((e) => {
      if (e.date !== TODAY) return;
      e.type === 1 ? set.add(e.serviceId) : set.delete(e.serviceId);
    });
    return set;
  }, [cal.data]);
}

export function useShapes() {
  return useQuery({
    queryKey: ['shapes'],
    queryFn: async () => {
      const out = await apiGet<{ ShapePointsData: ShapePointDTO[] }>('/Shape');
      const byId = new Map<string, [number, number][]>();
      (out.ShapePointsData || [])
        .slice()
        .sort((a, b) => (a.ShapePointSequence || 0) - (b.ShapePointSequence || 0))
        .forEach((p) => {
          if (!byId.has(p.ShapeId)) byId.set(p.ShapeId, []);
          byId.get(p.ShapeId)!.push([p.ShapePointLat, p.ShapePointLon]);
        });
      return byId;
    },
    staleTime: Infinity
  });
}

function buildDirection(trips: TripDTO[], stopTimesByTrip: Map<string, StopTimeDTO[]>, activeServices: Set<string>): RouteDirection {
  const withSeq = trips.map((t) => {
    const seq = stopTimesByTrip.get(t.TripId) || [];
    const start = seq.length ? toMinutes(seq[0].StopTimeDepartureTime ?? seq[0].StopTimeArrivalTime) : null;
    const end = seq.length ? toMinutes(seq[seq.length - 1].StopTimeArrivalTime ?? seq[seq.length - 1].StopTimeDepartureTime) : null;
    return { trip: t, seq, start, end };
  }).filter((x) => x.start !== null) as { trip: TripDTO; seq: StopTimeDTO[]; start: number; end: number }[];
  withSeq.sort((a, b) => a.start - b.start);

  const pattern = withSeq.slice().sort((a, b) => b.seq.length - a.seq.length)[0];
  const active = withSeq.filter((x) => activeServices.has(x.trip.ServiceId));
  const base = active.length ? active : withSeq;
  const gaps: number[] = [];
  for (let i = 1; i < base.length; i++) gaps.push(base[i].start - base[i - 1].start);
  gaps.sort((a, b) => a - b);

  return {
    pattern: pattern ? pattern.seq.map((s) => ({
      stopId: s.StopId, seq: s.StopTimeSequence,
      offset: Math.round(toMinutes(s.StopTimeDepartureTime ?? s.StopTimeArrivalTime) - pattern.start)
    })) : [],
    headsign: pattern?.trip.TripHeadsign || (pattern ? pattern.seq[pattern.seq.length - 1]?.StopId : '') || '—',
    headway: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null,
    first: base.length ? base[0].start : null,
    last: base.length ? base[base.length - 1].start : null,
    runTime: pattern ? Math.round(pattern.end - pattern.start) : null,
    shapeId: pattern?.trip.ShapeId || null,
    tripCount: withSeq.length,
    services: [...new Set(withSeq.map((x) => x.trip.ServiceId))]
  };
}

// Detalle de una ruta: trips + stop_times, agrupados por sentido (direction_id).
// Al resolver, indexa sus paradas en usePatternIndex (reemplaza /RoutesByStop).
export function useRouteDetail(routeId: string | null, route: RouteN | undefined, activeServices: Set<string>) {
  const index = usePatternIndex((s) => s.index);
  const query = useQuery({
    queryKey: ['routeDetail', routeId],
    enabled: !!routeId,
    queryFn: async (): Promise<RouteDetail> => {
      const out = await apiGet<{ TripData: TripDTO[]; StopTimesData: StopTimeDTO[] }>('/Trip', { Routeidfilter: routeId! });
      const trips = out.TripData || [], sts = out.StopTimesData || [];
      if (sts.length) detectUnit(sts);
      const byTrip = new Map<string, StopTimeDTO[]>();
      sts.forEach((s) => { if (!byTrip.has(s.TripId)) byTrip.set(s.TripId, []); byTrip.get(s.TripId)!.push(s); });
      byTrip.forEach((a) => a.sort((x, y) => x.StopTimeSequence - y.StopTimeSequence));
      const dirs: [RouteDirection, RouteDirection] = [0, 1].map((d) =>
        buildDirection(trips.filter((t) => (t.TripDirectionId || 0) === d), byTrip, activeServices)
      ) as [RouteDirection, RouteDirection];
      return { routeId: routeId!, dirs, tripCount: trips.length };
    }
  });
  useEffect(() => {
    if (query.data && route) {
      const stopIds = new Set<string>();
      query.data.dirs.forEach((d) => d.pattern.forEach((p) => stopIds.add(p.stopId)));
      if (stopIds.size) index([...stopIds], route);
    }
  }, [query.data, route, index]);
  return query;
}

// Precarga en segundo plano las primeras N rutas (para colorear "Cerca de ti" antes de que el usuario entre a cada una).
export function usePrefetchRoutes(routes: RouteN[] | undefined, activeServices: Set<string>, limit = 30) {
  const targets = useMemo(() => (routes || []).slice(0, limit), [routes, limit]);
  return useQueries({
    queries: targets.map((r) => ({
      queryKey: ['routeDetail', r.id],
      queryFn: async (): Promise<RouteDetail> => {
        const out = await apiGet<{ TripData: TripDTO[]; StopTimesData: StopTimeDTO[] }>('/Trip', { Routeidfilter: r.id });
        const trips = out.TripData || [], sts = out.StopTimesData || [];
        if (sts.length) detectUnit(sts);
        const byTrip = new Map<string, StopTimeDTO[]>();
        sts.forEach((s) => { if (!byTrip.has(s.TripId)) byTrip.set(s.TripId, []); byTrip.get(s.TripId)!.push(s); });
        byTrip.forEach((a) => a.sort((x, y) => x.StopTimeSequence - y.StopTimeSequence));
        const dirs: [RouteDirection, RouteDirection] = [0, 1].map((d) =>
          buildDirection(trips.filter((t) => (t.TripDirectionId || 0) === d), byTrip, activeServices)
        ) as [RouteDirection, RouteDirection];
        return { routeId: r.id, dirs, tripCount: trips.length };
      },
      staleTime: 5 * 60_000
    }))
  }) as UseQueryResult<RouteDetail>[];
}

// Paradas cercanas a una coordenada real (ubicación del device), vía GET /StopsNearby.
// queryKey incluye lat/lon: cada vez que useGeolocation refresca la posición, refetchea sola.
export function useStopsNearby(lat: number | null, lon: number | null, radiusMeters: number) {
  return useQuery({
    queryKey: ['stopsNearby', lat, lon, radiusMeters],
    enabled: lat != null && lon != null,
    queryFn: async () => {
      const out = await apiGet<{ StopNearbyData: StopNearbyDTO[] }>('/StopsNearby', {
        Latitude: lat!, Longitude: lon!, Radiusmeters: radiusMeters
      });
      const list = dedupeById((out.StopNearbyData || [])
        .filter((s) => s.StopLat && s.StopLon)
        .map((s): Stop => ({
          id: s.StopId, code: s.StopCode, name: s.StopName || s.StopId,
          lat: +s.StopLat, lon: +s.StopLon, wheelchair: s.StopWheelchairBoarding,
          dist: s.DistanceMeters != null ? +s.DistanceMeters : undefined
        })));
      return list.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
    }
  });
}

export function useStopsByName(q: string) {
  return useQuery({
    queryKey: ['stopsByName', q],
    enabled: q.trim().length > 0,
    queryFn: async () => {
      const out = await apiGet<{ StopData: StopDTO[] }>('/StopsByName', { Searchtext: q });
      return dedupeById((out.StopData || []).filter((s) => s.StopLat && s.StopLon).map((s): Stop => ({
        id: s.StopId, code: s.StopCode, name: s.StopName || s.StopId, lat: +s.StopLat, lon: +s.StopLon
      })));
    }
  });
}
