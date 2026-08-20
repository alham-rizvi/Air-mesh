export * from './rescue-location-contract';

/** Web and test environments never attempt location capture; Android/iOS resolve the native sibling. */
export async function captureRescueLocation(): Promise<import('./rescue-location-contract').RescueLocationCapture> {
  return { state: 'unavailable', reason: 'Foreground rescue location requires the native mobile build.' };
}
