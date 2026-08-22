// Formas de respuesta de GtfsExposeAPI (OpenAPI GeneXus). Sólo los campos que consumimos.

export interface FeedVersionDTO {
  FeedVersionCode?: string; FeedVersionName?: string; PublishedDate?: string;
  ValidFrom?: string; ValidTo?: string; Status?: number; SourceUrl?: string;
}
export interface AgencyDTO { AgencyId: string; AgencyName?: string; AgencyUrl?: string; AgencyTimezone?: string; }
export interface RouteDTO {
  RouteId: string; AgencyId: string; RouteShortName?: string; RouteLongName?: string;
  RouteType: number; RouteColor?: string; RouteTextColor?: string; RouteSortOrder?: number;
}
export interface StopDTO {
  StopId: string; StopCode?: string; StopName?: string; StopLat: string | number; StopLon: string | number;
  StopLocationType?: number; ParentStationId?: string; StopWheelchairBoarding?: number;
}
export interface StopNearbyDTO extends StopDTO { DistanceMeters?: string | number; }
export interface CalendarDTO {
  CalendarServiceId: string; CalendarMonday: boolean; CalendarTuesday: boolean; CalendarWednesday: boolean;
  CalendarThursday: boolean; CalendarFriday: boolean; CalendarSaturday: boolean; CalendarSunday: boolean;
  CalendarStartDate?: string; CalendarEndDate?: string;
}
export interface CalendarDateDTO { CalendarServiceId: string; CalendarDateDate: string; CalendarDateExceptionType: number; }
export interface TripDTO {
  TripId: string; RouteId: string; ServiceId: string; ShapeId?: string;
  TripHeadsign?: string; TripDirectionId?: number;
}
export interface StopTimeDTO {
  TripId: string; StopTimeSequence: number; StopId: string;
  StopTimeArrivalTime?: number; StopTimeDepartureTime?: number;
}
export interface ShapePointDTO { ShapeId: string; ShapePointSequence?: number; ShapePointLat: number; ShapePointLon: number; }

// ---- Modelo normalizado usado por la UI ----
export interface Agency { id: string; name: string; url?: string; }
export interface Stop {
  id: string; code?: string; name: string; lat: number; lon: number;
  wheelchair?: number; dist?: number; // dist: metros al centro del feed, o a la ubicación del usuario si viene de /StopsNearby
}
export interface RouteN {
  id: string; agencyId: string; short: string; long: string;
  type: number; typeName: string; color: string; text: string; sort: number;
}
export interface Calendar {
  id: string; from: string; to: string; days: boolean[];
  raw: CalendarDTO;
}
export interface CalendarException { serviceId: string; date: string; type: number; }

export interface RoutePatternStop { stopId: string; seq: number; offset: number; }
export interface RouteDirection {
  pattern: RoutePatternStop[];
  headsign: string;
  headway: number | null;
  first: number | null;
  last: number | null;
  runTime: number | null;
  shapeId: string | null;
  tripCount: number;
  services: string[];
}
export interface RouteDetail { routeId: string; dirs: [RouteDirection, RouteDirection]; tripCount: number; error?: string; }
