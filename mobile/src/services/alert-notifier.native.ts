import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DisasterAlert } from '../types/security-data';

const ALERT_CHANNEL = 'urgent-disaster-alerts';
const VIBRATION_PATTERN = [0, 300, 150, 500, 150, 300];

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });

export async function requestLocalAlertPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, { name: 'Urgent disaster alerts', importance: Notifications.AndroidImportance.MAX, vibrationPattern: VIBRATION_PATTERN, sound: 'default', lightColor: '#FF5964' });
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted' ? 'granted' : 'denied';
}

export async function notifyLocalAlert(alert: DisasterAlert): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, { name: 'Urgent disaster alerts', importance: Notifications.AndroidImportance.MAX, vibrationPattern: VIBRATION_PATTERN, sound: 'default', lightColor: '#FF5964' });
  await Notifications.scheduleNotificationAsync({ content: { title: `${alert.severity.toUpperCase()} · ${alert.title}`, body: alert.summary, sound: 'default', data: { kind: 'disaster-alert', alertId: alert.id, source: alert.source }, ...(Platform.OS === 'android' ? { color: '#FF5964' } : {}) }, trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: ALERT_CHANNEL } : null });
  return true;
}
