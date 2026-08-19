import { useCallback, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Device from 'expo-device';
import { useDeviceStore } from '@/lib/air-mesh-store';

export function useDeviceReadiness() {
  const { permissionStatus, platform, model, setPermissionStatus, setDevice } = useDeviceStore();
  useEffect(() => {
    setDevice(Device.osName || Platform.OS, Device.modelName || (Platform.OS === 'web' ? 'Browser' : 'Unknown device'));
  }, [setDevice]);
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setPermissionStatus(Platform.OS === 'web' ? 'unsupported' : 'granted');
      return;
    }
    try {
      const permissions: any[] = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const scan = (PermissionsAndroid.PERMISSIONS as Record<string, string>).BLUETOOTH_SCAN;
      const connect = (PermissionsAndroid.PERMISSIONS as Record<string, string>).BLUETOOTH_CONNECT;
      if (scan) permissions.push(scan);
      if (connect) permissions.push(connect);
      const result = await PermissionsAndroid.requestMultiple(permissions);
      const granted = permissions.every((permission) => (result as Record<string, string>)[permission] === PermissionsAndroid.RESULTS.GRANTED);
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch {
      setPermissionStatus('denied');
    }
  }, [setPermissionStatus]);
  return { permissionStatus, platform, model, requestPermissions };
}
