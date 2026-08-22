import type { Agency, RouteN } from '../api/types';

export function agencyNamesFor(routes: RouteN[], agencies: Agency[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  routes.forEach((r) => {
    if (seen.has(r.agencyId)) return;
    seen.add(r.agencyId);
    const a = agencies.find((x) => x.id === r.agencyId);
    names.push(a ? a.name : r.agencyId);
  });
  return names;
}
