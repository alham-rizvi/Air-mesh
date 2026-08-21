import { Platform } from 'react-native';
import { auditService } from './auditService';
import { BlePlxTransport } from './ble-transport';
import { createAndroidGattClient } from './gatt-peripheral-client';
import { GattPeripheralTransport } from './gatt-peripheral-transport';
import { meshService } from './mesh-service';

export type TransportRuntimeState = 'native-ble-ready' | 'unavailable' | 'initialization-failed';

let initialized = false;

export async function initializeMeshRuntime(): Promise<TransportRuntimeState> {
  if (initialized) return Platform.OS === 'web' ? 'unavailable' : 'native-ble-ready';
  if (Platform.OS === 'web') {
    initialized = true;
    await auditService.logAction('mesh_transport_unavailable', { platform: 'web', reason: 'BLE requires native Android build' });
    return 'unavailable';
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
    return 'native-ble-ready';
  } catch (error) {
    initialized = true;
    await auditService.logAction('mesh_transport_unavailable', { platform: Platform.OS, reason: error instanceof Error ? error.message : 'BLE adapter initialization failed' });
    return 'initialization-failed';
  }
}

/** Starts discoverable Air-Mesh GATT advertising after Android nearby permissions have been granted. */
export async function startMeshAdvertising(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await meshService.startAdvertising();
    await auditService.logAction('mesh_gatt_advertising_started', { platform: Platform.OS });
    return true;
  } catch (error) {
    await auditService.logAction('mesh_gatt_advertising_unavailable', { platform: Platform.OS, reason: error instanceof Error ? error.message : 'Advertising failed' });
    return false;
  }
}
