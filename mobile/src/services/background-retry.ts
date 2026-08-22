import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { auditService } from './auditService';
import { retryQueuedEncryptedEnvelopes } from './integration-service';

export const AIR_MESH_RETRY_TASK = 'air-mesh-queued-retry-maintenance';

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(AIR_MESH_RETRY_TASK)) {
  TaskManager.defineTask(AIR_MESH_RETRY_TASK, async () => {
    try {
      const result = await retryQueuedEncryptedEnvelopes();
      await auditService.logAction('background_retry_maintenance', { attempted: result.attempted, immediate_transport_accepted: result.accepted, best_effort_only: true });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Android WorkManager runs this opportunistically; it does not guarantee radio discovery or delivery timing. */
export async function registerBestEffortBackgroundRetry(): Promise<boolean> {
  if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) return false;
  if (!(await TaskManager.isTaskRegisteredAsync(AIR_MESH_RETRY_TASK))) await BackgroundTask.registerTaskAsync(AIR_MESH_RETRY_TASK, { minimumInterval: 15 * 60 });
  return true;
}
