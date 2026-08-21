import { describe, expect, it } from 'vitest';
import { AIR_MESH_MIN_ANDROID_API, buildNearbyPermissionPlan, evaluateAndroidCompatibility, normalizeAndroidApiLevel } from '../mobile/src/services/android-readiness';
import { BOUNDED_BLE_SCAN_WINDOW_MS, scanSecondsRemaining } from '../mobile/src/services/discovery';

describe('Android discovery readiness', () => {
  it('enforces the documented Android API boundary before BLE discovery', () => {
    expect(AIR_MESH_MIN_ANDROID_API).toBe(24);
    expect(normalizeAndroidApiLevel('31')).toBe(31);
    expect(evaluateAndroidCompatibility('android', 23).status).toBe('unsupported');
    expect(evaluateAndroidCompatibility('android', 24).status).toBe('supported');
    expect(evaluateAndroidCompatibility('web').status).toBe('not-android');
  });

  it('uses Nearby permissions on Android 12+ and explains legacy location discovery accurately', () => {
    const modern = buildNearbyPermissionPlan(31, { scan: 'BLUETOOTH_SCAN', connect: 'BLUETOOTH_CONNECT', advertise: 'BLUETOOTH_ADVERTISE', fineLocation: 'ACCESS_FINE_LOCATION' });
    expect(modern.permissions).toEqual(['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT', 'BLUETOOTH_ADVERTISE']);
    expect(modern.rationale).toContain('Nearby devices');
    const legacy = buildNearbyPermissionPlan(30, { fineLocation: 'ACCESS_FINE_LOCATION' });
    expect(legacy.permissions).toEqual(['ACCESS_FINE_LOCATION']);
    expect(legacy.rationale).toContain('does not collect GPS location for discovery');
  });

  it('reports a truthful bounded scan countdown', () => {
    expect(scanSecondsRemaining(0)).toBe(5);
    expect(scanSecondsRemaining(1_100)).toBe(4);
    expect(scanSecondsRemaining(BOUNDED_BLE_SCAN_WINDOW_MS)).toBe(0);
  });
});
