import { beforeEach, describe, expect, it } from 'vitest';

import { database } from '../mobile/src/services/db';
import { acknowledgeLocalAlert, createLocalAlert, listLocalAlerts } from '../mobile/src/services/alert-service';

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
});
