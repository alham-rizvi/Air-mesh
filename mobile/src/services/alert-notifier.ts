import type { DisasterAlert } from '../types/security-data';

export async function requestLocalAlertPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  return 'unsupported';
}

export async function notifyLocalAlert(_alert: DisasterAlert): Promise<boolean> {
  return false;
}
