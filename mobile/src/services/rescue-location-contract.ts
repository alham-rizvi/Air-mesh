export interface RescueLocation {
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  captured_at: string;
  source: 'device';
}

export type RescueLocationCapture =
  | { state: 'captured'; location: RescueLocation }
  | { state: 'unavailable'; reason: string };

export function isValidRescueLocation(value: RescueLocation): boolean {
  return Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180 && Number.isFinite(Date.parse(value.captured_at));
}
