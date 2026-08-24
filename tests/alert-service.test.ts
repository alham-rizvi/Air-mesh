import { beforeEach, describe, expect, it } from 'vitest';

import { database } from '../mobile/src/services/db';
import { acknowledgeLocalAlert, createLocalAlert, listLocalAlerts, subscribeToAlerts } from '../mobile/src/services/alert-service';

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
});
