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
  const issuedAt = now();
  const title = input.title.trim();
  const summary = input.summary.trim();
  const type = input.type.trim();
  const originDeviceId = (input.originDeviceId ?? 'local-device').trim();
  if (!title || !summary || !type || !originDeviceId) throw new Error('Alert title, summary, type, and origin device are required.');
  if (title.length > 180 || summary.length > 4000 || type.length > 80 || originDeviceId.length > 128) throw new Error('Alert fields exceed supported local limits.');
  if (input.expiresAt) {
    const expiresAt = Date.parse(input.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.parse(issuedAt)) throw new Error('Alert expiry must be a valid time after issuance.');
  }
  const alert: DisasterAlert = { id: uuid(), title, summary, type, severity: input.severity, source: input.source, issued_at: issuedAt, expires_at: input.expiresAt ?? null, status: 'active', origin_device_id: originDeviceId, acknowledged_at: null };
  await database.saveAlert(alert);
  await auditService.logAction('disaster_alert_created', { alert_id: alert.id, type: alert.type, severity: alert.severity, source: alert.source });
  listeners.forEach((listener) => {
    try {
      listener(alert);
    } catch (error) {
      console.warn('[Alerts] Listener failed after durable alert save', error instanceof Error ? error.message : 'unknown');
    }
  });
  const notified = await notifyLocalAlert(alert).catch(() => false);
  return { alert, notified };
}

export async function listLocalAlerts(): Promise<DisasterAlert[]> {
  return database.listAlerts();
}

export async function mirrorControlledAlert(alert: DisasterAlert): Promise<DisasterAlert> {
  return (await mirrorControlledAlerts([alert]))[0];
}

/**
 * Mirrors one controlled server refresh with a single local read. Local acknowledgement
 * fields always win because they record an on-device operator action, not a publisher state.
 */
export async function mirrorControlledAlerts(alerts: DisasterAlert[]): Promise<DisasterAlert[]> {
  if (alerts.length === 0) return [];
  const existingById = new Map((await database.listAlerts()).map((entry) => [entry.id, entry]));
  const mirrored: DisasterAlert[] = [];
  for (const alert of alerts) {
    const existing = existingById.get(alert.id);
    const next: DisasterAlert = {
      ...alert,
      status: existing?.status ?? 'active',
      acknowledged_at: existing?.acknowledged_at ?? null,
    };
    await database.saveAlert(next);
    if (!existing) {
      await auditService.logAction('controlled_alert_mirrored', { alert_id: next.id, type: next.type, severity: next.severity, source: next.source });
    }
    mirrored.push(next);
  }
  return mirrored;
}

export async function acknowledgeLocalAlert(alertId: string): Promise<void> {
  const existing = (await database.listAlerts()).find((alert) => alert.id === alertId);
  if (!existing) throw new Error('Local alert was not found.');
  if (existing.status === 'acknowledged') return;
  await database.acknowledgeAlert(alertId, now());
  await auditService.logAction('disaster_alert_acknowledged', { alert_id: alertId });
}
