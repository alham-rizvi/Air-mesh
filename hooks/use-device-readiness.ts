import { useCallback, useEffect, useMemo } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import * as Device from 'expo-device';
import { useDeviceStore } from '@/lib/air-mesh-store';
import { buildNearbyPermissionPlan, evaluateAndroidCompatibility } from '@/mobile/src/services/android-readiness';

export function useDeviceReadiness() {
  const { permissionStatus, platform, model, setPermissionStatus, setDevice } = useDeviceStore();
  const compatibility = useMemo(() => evaluateAndroidCompatibility(Platform.OS, Platform.Version), []);
  const permissionPlan = useMemo(() => {
    const permissions = Platform.OS === 'android'
      ? ((PermissionsAndroid?.PERMISSIONS ?? {}) as Record<string, string>)
      : {};
    return buildNearbyPermissionPlan(compatibility.apiLevel ?? 0, {
      scan: permissions.BLUETOOTH_SCAN,
      connect: permissions.BLUETOOTH_CONNECT,
      advertise: permissions.BLUETOOTH_ADVERTISE,
      nearbyWifi: permissions.NEARBY_WIFI_DEVICES,
      fineLocation: permissions.ACCESS_FINE_LOCATION,
    });
  }, [compatibility.apiLevel]);
  useEffect(() => {
    setDevice(Device.osName || Platform.OS, Device.modelName || (Platform.OS === 'web' ? 'Browser' : 'Unknown device'));
  }, [setDevice]);
  const requestPermissions = useCallback(async () => {
    if (compatibility.status !== 'supported') {
      setPermissionStatus(Platform.OS === 'web' ? 'unsupported' : 'granted');
      return false;
    }
    try {
      const result = await PermissionsAndroid.requestMultiple(permissionPlan.permissions as Parameters<typeof PermissionsAndroid.requestMultiple>[0]);
      const granted = permissionPlan.permissions.length > 0 && permissionPlan.permissions.every((permission) => (result as Record<string, string>)[permission] === PermissionsAndroid.RESULTS.GRANTED);
      setPermissionStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch {
      setPermissionStatus('denied');
      return false;
    }
  }, [compatibility.status, permissionPlan.permissions, setPermissionStatus]);
  const openBluetoothSettings = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    try {
      await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
      return true;
    } catch {
      try {
        await Linking.openSettings();
        return true;
      } catch {
        return false;
      }
    }
  }, []);
  return { permissionStatus, platform, model, compatibility, permissionRationale: permissionPlan.rationale, requestPermissions, openBluetoothSettings };
}
