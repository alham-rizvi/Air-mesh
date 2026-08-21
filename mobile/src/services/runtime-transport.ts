import { Platform } from 'react-native';
import { auditService } from './auditService';
import { BlePlxTransport } from './ble-transport';
import { createAndroidGattClient } from './gatt-peripheral-client';
import { GattPeripheralTransport } from './gatt-peripheral-transport';
import { meshService } from './mesh-service';
import { createAndroidWifiDirectClient } from './wifi-direct-client';
import { WifiDirectTransport } from './wifi-direct-transport';

export type TransportRuntimeState = 'native-wifi-direct-ready' | 'native-ble-ready' | 'unavailable' | 'initialization-failed';

let initialized = false;
let runtimeState: TransportRuntimeState = 'unavailable';

export async function initializeMeshRuntime(): Promise<TransportRuntimeState> {
  if (initialized) return runtimeState;
  if (Platform.OS === 'web') {
    initialized = true;
    await auditService.logAction('mesh_transport_unavailable', { platform: 'web', reason: 'Nearby transport requires a native Android build' });
    runtimeState = 'unavailable';
    return runtimeState;
  }

  if (Platform.OS === 'android') {
    try {
      const wifiClient = createAndroidWifiDirectClient();
      const support = await wifiClient.isSupported();
      if (support.supported) {
        meshService.setTransport(new WifiDirectTransport(wifiClient));
        initialized = true;
        await auditService.logAction('mesh_transport_ready', { platform: Platform.OS, transport: 'wifi-direct-phone-p2p', internet_required: false });
        runtimeState = 'native-wifi-direct-ready';
        return runtimeState;
      }
      await auditService.logAction('mesh_wifi_direct_unavailable', { platform: Platform.OS, reason: support.reason });
    } catch (wifiError) {
      await auditService.logAction('mesh_wifi_direct_unavailable', { platform: Platform.OS, reason: wifiError instanceof Error ? wifiError.message : 'Native Wi-Fi Direct bridge unavailable' });
    }
  }

  try {
    const module = await import('react-native-ble-plx');
    const manager = new module.BleManager();
    const central = new BlePlxTransport(manager);
    try {
      meshService.setTransport(new GattPeripheralTransport(central, createAndroidGattClient()));
      await auditService.logAction('mesh_transport_ready', { platform: Platform.OS, transport: 'ble-central-gatt-peripheral' });
    } catch (gattError) {
      meshService.setTransport(central);
      await auditService.logAction('mesh_gatt_peripheral_unavailable', { platform: Platform.OS, reason: gattError instanceof Error ? gattError.message : 'Native GATT bridge unavailable' });
    }
    initialized = true;
    runtimeState = 'native-ble-ready';
    return runtimeState;
  } catch (error) {
    initialized = true;
    await auditService.logAction('mesh_transport_unavailable', { platform: Platform.OS, reason: error instanceof Error ? error.message : 'Nearby transport initialization failed' });
    runtimeState = 'initialization-failed';
    return runtimeState;
  }
}

/** Starts the active native peer discovery service after Android nearby permissions have been granted. */
export async function startMeshAdvertising(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await meshService.startAdvertising();
    await auditService.logAction('mesh_peer_discovery_started', { platform: Platform.OS });
    return true;
  } catch (error) {
    await auditService.logAction('mesh_peer_discovery_unavailable', { platform: Platform.OS, reason: error instanceof Error ? error.message : 'Discovery failed' });
    return false;
  }
}
