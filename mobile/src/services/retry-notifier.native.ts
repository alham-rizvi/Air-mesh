import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const RETRY_CHANNEL = 'mesh-retry';
const notifiedPeers = new Set<string>();

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export async function notifyPeerEligibleForRetry(input: { peerId?: string; attempted: number }): Promise<boolean> {
  if (input.attempted === 0) return false;
  const dedupeKey = input.peerId ?? 'route-update';
  if (notifiedPeers.has(dedupeKey)) return false;
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(RETRY_CHANNEL, { name: 'Mesh retry', importance: Notifications.AndroidImportance.DEFAULT });
  await Notifications.scheduleNotificationAsync({ content: { title: 'Air-Mesh retry started', body: `A nearby peer became eligible; retrying ${input.attempted} queued encrypted envelope${input.attempted === 1 ? '' : 's'}. This is not delivery confirmation.`, data: { kind: 'peer-retry' }, ...(Platform.OS === 'android' ? { sound: false } : {}) }, trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: RETRY_CHANNEL } : null });
  notifiedPeers.add(dedupeKey);
  return true;
}
