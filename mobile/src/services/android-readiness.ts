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
    return { status: 'not-android', apiLevel: null, reason: 'Nearby phone-to-phone discovery is available only in the Android native build. Local offline records remain available on this platform.' };
  }

  const apiLevel = normalizeAndroidApiLevel(version);
  if (apiLevel === null || apiLevel < AIR_MESH_MIN_ANDROID_API) {
    return {
      status: 'unsupported',
      apiLevel,
      reason: `Air-Mesh requires Android ${AIR_MESH_MIN_ANDROID_API} or later for native nearby transport. You can still use local-only records on this device.`,
    };
  }

  return {
    status: 'supported',
    apiLevel,
    reason: `Android ${apiLevel} supports Air-Mesh native nearby transport. Wi-Fi Direct is preferred when the device supports it; Bluetooth/GATT remains a fallback. Nearby permission is requested only when you choose to enable discovery.`,
  };
}

/**
 * Android 12+ exposes Bluetooth scan/connect permissions and Android 13+ exposes
 * Nearby Wi-Fi permission. Older supported Android releases require fine location
 * at runtime for nearby Bluetooth/Wi-Fi discovery. This function
 * is intentionally pure so UI and tests share the same permission rationale.
 */
export function buildNearbyPermissionPlan(apiLevel: number, permissions: { scan?: string; connect?: string; advertise?: string; nearbyWifi?: string; fineLocation?: string }): NearbyPermissionPlan {
  if (apiLevel >= 31) {
    return {
      permissions: [permissions.scan, permissions.connect, permissions.advertise, ...(apiLevel >= 33 ? [permissions.nearbyWifi] : [])].filter((value): value is string => Boolean(value)),
      rationale: 'Air-Mesh uses Nearby devices, Bluetooth, and supported local Wi-Fi peer-to-peer features to discover and connect nearby phones. The Wi-Fi permission enables a local link, not an internet connection; Air-Mesh does not use it to read contacts.',
    };
  }
  return {
    permissions: [permissions.fineLocation].filter((value): value is string => Boolean(value)),
    rationale: 'Android requires location permission for nearby Bluetooth or Wi-Fi discovery on this Android version. Air-Mesh does not collect GPS location for discovery; location is attached only to an SOS you explicitly send.',
  };
}
