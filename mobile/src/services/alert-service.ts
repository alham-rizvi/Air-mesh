import { auditService } from './auditService';
import { database, now, uuid } from './db';
import { notifyLocalAlert } from './alert-notifier';
import type { AlertSeverity, AlertSource, DisasterAlert } from '../types/security-data';

type AlertInput = { title: string; summary: string; type: string; severity: AlertSeverity; source: AlertSource; originDeviceId?: string; expiresAt?: string | null };
type AlertListener = (alert: DisasterAlert) => void;
const listeners = new Set<AlertListener>();

export function subscribeToAlerts(listener: AlertListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function createLocalAlert(input: AlertInput): Promise<{ alert: DisasterAlert; notified: boolean }> {
  const alert: DisasterAlert = { id: uuid(), title: input.title.trim(), summary: input.summary.trim(), type: input.type.trim(), severity: input.severity, source: input.source, issued_at: now(), expires_at: input.expiresAt ?? null, status: 'active', origin_device_id: input.originDeviceId ?? 'local-device', acknowledged_at: null };
  if (!alert.title || !alert.summary || !alert.type) throw new Error('Alert title, summary, and type are required.');
  await database.saveAlert(alert);
  await auditService.logAction('disaster_alert_created', { alert_id: alert.id, type: alert.type, severity: alert.severity, source: alert.source });
  listeners.forEach((listener) => listener(alert));
  const notified = await notifyLocalAlert(alert).catch(() => false);
  return { alert, notified };
}

export async function listLocalAlerts(): Promise<DisasterAlert[]> {
  return database.listAlerts();
}

export async function acknowledgeLocalAlert(alertId: string): Promise<void> {
  await database.acknowledgeAlert(alertId, now());
  await auditService.logAction('disaster_alert_acknowledged', { alert_id: alertId });
}
