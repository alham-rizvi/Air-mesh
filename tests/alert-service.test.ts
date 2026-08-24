import { beforeEach, describe, expect, it } from 'vitest';

import { database } from '../mobile/src/services/db';
import { acknowledgeLocalAlert, createLocalAlert, listLocalAlerts, mirrorControlledAlert, subscribeToAlerts } from '../mobile/src/services/alert-service';
import { dashboardAlertState } from '../mobile/src/services/alert-dashboard-state';

describe('local disaster alerts', () => {
  beforeEach(async () => {
    await database.initialize();
  });

  it('persists and acknowledges a local alert without claiming an external feed', async () => {
    const { alert } = await createLocalAlert({ title: 'Test evacuation notice', summary: 'This is a local test alert only.', type: 'test', severity: 'high', source: 'local_report' });
    expect((await listLocalAlerts()).some((entry) => entry.id === alert.id && entry.status === 'active')).toBe(true);
    await acknowledgeLocalAlert(alert.id);
    expect((await listLocalAlerts()).find((entry) => entry.id === alert.id)?.status).toBe('acknowledged');
  });

  it('rejects malformed expiry values and isolates listener failures after persistence', async () => {
    await expect(createLocalAlert({ title: 'Invalid expiry', summary: 'Reject malformed expiry.', type: 'test', severity: 'low', source: 'local_report', expiresAt: 'not-a-date' })).rejects.toThrow('Alert expiry');
    const unsubscribe = subscribeToAlerts(() => { throw new Error('presentation listener failed'); });
    const { alert } = await createLocalAlert({ title: 'Listener isolation', summary: 'The durable save must survive a listener failure.', type: 'test', severity: 'moderate', source: 'local_report' });
    unsubscribe();
    expect((await listLocalAlerts()).some((entry) => entry.id === alert.id)).toBe(true);
  });

  it('does not audit a missing local acknowledgement as a successful action', async () => {
    await expect(acknowledgeLocalAlert('missing-alert')).rejects.toThrow('not found');
  });

  it('mirrors controlled alerts into local durable state and retains a local acknowledgement', async () => {
    const record = { id: 'controlled-dashboard-alert', title: 'Controlled safety notice', summary: 'Controlled record for dashboard status coverage.', type: 'safety' as const, severity: 'moderate' as const, source: 'controlled_publisher' as const, issued_at: '2026-08-24T00:00:00.000Z', expires_at: null, status: 'active' as const, origin_device_id: 'publisher-1', acknowledged_at: null };
    await mirrorControlledAlert(record);
    await acknowledgeLocalAlert(record.id);
    await mirrorControlledAlert(record);
    expect((await listLocalAlerts()).find((entry) => entry.id === record.id)?.status).toBe('acknowledged');
  });

  it('classifies dashboard records as active, acknowledged, or expired deterministically', () => {
    const base = { id: 'dashboard-state', title: 'State', summary: 'State', type: 'test' as const, severity: 'low' as const, source: 'local_report' as const, issued_at: '2026-08-24T00:00:00.000Z', origin_device_id: 'local-device', acknowledged_at: null };
    expect(dashboardAlertState({ ...base, status: 'active', expires_at: '2026-08-25T00:00:00.000Z' }, Date.parse('2026-08-24T12:00:00.000Z'))).toBe('active');
    expect(dashboardAlertState({ ...base, status: 'acknowledged', expires_at: '2026-08-20T00:00:00.000Z', acknowledged_at: '2026-08-24T01:00:00.000Z' }, Date.parse('2026-08-24T12:00:00.000Z'))).toBe('acknowledged');
    expect(dashboardAlertState({ ...base, status: 'active', expires_at: '2026-08-20T00:00:00.000Z' }, Date.parse('2026-08-24T12:00:00.000Z'))).toBe('expired');
  });
});
