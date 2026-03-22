/** Expo Router の search params が string | string[] になる場合への対応 */
export function normalizeRouteParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return typeof v === 'string' ? v : '';
}
