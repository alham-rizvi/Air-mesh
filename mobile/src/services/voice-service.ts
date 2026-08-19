import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

export interface VoiceNote {
  uri: string;
  duration_ms: number;
  content_type: 'voice';
}

export async function requestVoicePermission(): Promise<boolean> {
  const current = await getRecordingPermissionsAsync();
  if (current.granted) return true;
  const requested = await requestRecordingPermissionsAsync();
  return requested.granted;
}

export async function prepareVoiceRecording(): Promise<boolean> {
  const allowed = await requestVoicePermission();
  if (!allowed) return false;
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
  return true;
}

export function validateVoiceNote(durationMs: number): void {
  if (durationMs <= 0 || durationMs > 30_000) throw new Error('Voice notes must be between 1 and 30 seconds.');
}
