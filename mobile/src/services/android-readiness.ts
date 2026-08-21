export const AIR_MESH_MIN_ANDROID_API = 24;

export type AndroidCompatibility = {
  status: 'supported' | 'unsupported' | 'not-android';
  apiLevel: number | null;
  reason: string;
};

export type NearbyPermissionPlan = {
  permissions: string[];
  rationale: string;
};

export function normalizeAndroidApiLevel(version: string | number | undefined): number | null {
  if (typeof version === 'number' && Number.isFinite(version)) return Math.floor(version);
  if (typeof version === 'string') {
    const parsed = Number.parseInt(version, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateAndroidCompatibility(platform: string, version?: string | number): AndroidCompatibility {
  if (platform !== 'android') {
    return { status: 'not-android', apiLevel: null, reason: 'Nearby BLE discovery is available only in the Android native build. Local offline records remain available on this platform.' };
  }

  const apiLevel = normalizeAndroidApiLevel(version);
  if (apiLevel === null || apiLevel < AIR_MESH_MIN_ANDROID_API) {
    return {
      status: 'unsupported',
      apiLevel,
      reason: `Air-Mesh requires Android ${AIR_MESH_MIN_ANDROID_API} or later for the native BLE transport. You can still use local-only records on this device.`,
    };
  }

  return {
    status: 'supported',
    apiLevel,
    reason: `Android ${apiLevel} supports the Air-Mesh native BLE boundary. Nearby permission is requested only when you choose to enable discovery.`,
  };
}

/**
 * Android 12+ exposes Bluetooth scan/connect permissions. Older supported Android
 * releases require fine location at runtime for Bluetooth discovery. This function
 * is intentionally pure so UI and tests share the same permission rationale.
 */
export function buildNearbyPermissionPlan(apiLevel: number, permissions: { scan?: string; connect?: string; advertise?: string; fineLocation?: string }): NearbyPermissionPlan {
  if (apiLevel >= 31) {
    return {
      permissions: [permissions.scan, permissions.connect, permissions.advertise].filter((value): value is string => Boolean(value)),
      rationale: 'Air-Mesh uses Nearby devices and Bluetooth to scan, connect, and advertise its local Air-Mesh service for nearby phones. It does not use this permission to read contacts or access the internet.',
    };
  }
  return {
    permissions: [permissions.fineLocation].filter((value): value is string => Boolean(value)),
    rationale: 'Android requires location permission for Bluetooth discovery on this Android version. Air-Mesh does not collect GPS location for discovery; location is attached only to an SOS you explicitly send.',
  };
}
