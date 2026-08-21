import type { AndroidGattClient } from './gatt-peripheral-transport';

/** Web/Vitest fallback. Metro selects the `.native.ts` implementation on Android. */
export function createAndroidGattClient(): AndroidGattClient {
  throw new Error('Air-Mesh GATT peripheral is available only in an Android native build.');
}
