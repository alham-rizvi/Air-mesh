import * as Location from 'expo-location';
import type { RescueLocationCapture } from './rescue-location-contract';

export * from './rescue-location-contract';

/** Captures a one-time foreground location only after an operator triggers an emergency action. */
export async function captureRescueLocation(): Promise<RescueLocationCapture> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return { state: 'unavailable', reason: 'Location services are disabled on this device.' };
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return { state: 'unavailable', reason: 'Location permission was not granted.' };
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true });
    return {
      state: 'captured',
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy ?? null,
        captured_at: new Date(position.timestamp).toISOString(),
        source: 'device',
      },
    };
  } catch (error) {
    return { state: 'unavailable', reason: error instanceof Error ? error.message : 'A location fix could not be obtained.' };
  }
}
