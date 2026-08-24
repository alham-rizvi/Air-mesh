import AsyncStorage from '@react-native-async-storage/async-storage';

export const ALERT_CATEGORIES = ['safety', 'evacuation', 'weather', 'health', 'test'] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];
const KEY = 'airmesh.alert.categories.v1';

export async function loadAlertCategories(): Promise<AlertCategory[]> {
  const stored = await AsyncStorage.getItem(KEY);
  if (!stored) return ['safety', 'evacuation'];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return ['safety', 'evacuation'];
    const valid = parsed.filter((value): value is AlertCategory => ALERT_CATEGORIES.includes(value));
    return valid.length ? valid : ['safety', 'evacuation'];
  } catch {
    return ['safety', 'evacuation'];
  }
}

export async function saveAlertCategories(categories: AlertCategory[]): Promise<AlertCategory[]> {
  const normalized = [...new Set(categories.filter((value): value is AlertCategory => ALERT_CATEGORIES.includes(value)))];
  const next: AlertCategory[] = normalized.length ? normalized : ['safety', 'evacuation'];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
