import { Platform } from 'react-native';
import { auditService } from './auditService';
import { BlePlxTransport } from './ble-transport';
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
    meshService.setTransport(new BlePlxTransport(manager));
    initialized = true;
    await auditService.logAction('mesh_transport_ready', { platform: Platform.OS, transport: 'ble-central' });
    return 'native-ble-ready';
  } catch (error) {
    initialized = true;
    await auditService.logAction('mesh_transport_unavailable', { platform: Platform.OS, reason: error instanceof Error ? error.message : 'BLE adapter initialization failed' });
    return 'initialization-failed';
  }
}
