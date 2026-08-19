import { database, now, uuid } from './db';
import type { AuditLog } from '../types/security-data';

export interface AuditContext { deviceId?: string; }

let context: AuditContext = {};

export function configureAuditContext(next: AuditContext): void { context = { ...context, ...next }; }

export async function logAction(action: string, details: unknown, deviceId = context.deviceId ?? 'local-device'): Promise<AuditLog> {
  const log: AuditLog = { id: uuid(), device_id: deviceId, timestamp: now(), action, details: typeof details === 'object' && details !== null ? details as Record<string, unknown> : { value: details } };
  await database.saveAuditLog(log);
  return log;
}

export async function getLogs(filter?: string): Promise<AuditLog[]> { return database.getAuditLogs(filter); }

export const auditService = { configure: configureAuditContext, logAction, getLogs };
