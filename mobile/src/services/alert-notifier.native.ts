import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DisasterAlert } from '../types/security-data';

const ALERT_CHANNEL = 'disaster-alerts';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export async function requestLocalAlertPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, { name: 'Disaster alerts', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250], lightColor: '#00E5C8' });
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted' ? 'granted' : 'denied';
}

export async function notifyLocalAlert(alert: DisasterAlert): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, { name: 'Disaster alerts', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250], lightColor: '#00E5C8' });
  await Notifications.scheduleNotificationAsync({ content: { title: `${alert.severity.toUpperCase()} · ${alert.title}`, body: alert.summary, data: { kind: 'disaster-alert', alertId: alert.id, source: alert.source }, ...(Platform.OS === 'android' ? { color: '#00E5C8' } : {}) }, trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: ALERT_CHANNEL } : null });
  return true;
}
