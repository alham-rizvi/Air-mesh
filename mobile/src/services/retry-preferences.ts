import AsyncStorage from '@react-native-async-storage/async-storage';

export type RetryPreferences = { maxAttempts: number; retryIntervalMinutes: number };
export const DEFAULT_RETRY_PREFERENCES: RetryPreferences = { maxAttempts: 8, retryIntervalMinutes: 5 };
const RETRY_PREFERENCES_KEY = 'airmesh.retry-preferences.v1';

export function normalizeRetryPreferences(input: Partial<RetryPreferences>): RetryPreferences {
  const maxAttempts = [3, 8, 15].includes(input.maxAttempts ?? 0) ? input.maxAttempts! : DEFAULT_RETRY_PREFERENCES.maxAttempts;
  const retryIntervalMinutes = [1, 5, 15].includes(input.retryIntervalMinutes ?? 0) ? input.retryIntervalMinutes! : DEFAULT_RETRY_PREFERENCES.retryIntervalMinutes;
  return { maxAttempts, retryIntervalMinutes };
}

export async function getRetryPreferences(): Promise<RetryPreferences> {
  try { const raw = await AsyncStorage.getItem(RETRY_PREFERENCES_KEY); return raw ? normalizeRetryPreferences(JSON.parse(raw) as Partial<RetryPreferences>) : DEFAULT_RETRY_PREFERENCES; }
  catch { return DEFAULT_RETRY_PREFERENCES; }
}

export async function saveRetryPreferences(next: Partial<RetryPreferences>): Promise<RetryPreferences> {
  const current = await getRetryPreferences(); const normalized = normalizeRetryPreferences({ ...current, ...next });
  await AsyncStorage.setItem(RETRY_PREFERENCES_KEY, JSON.stringify(normalized));
  return normalized;
}
