import { afterEach, describe, expect, it, vi } from 'vitest';

import * as db from '../server/db';
import { appRouter } from '../server/routers';

function publisherCaller(token?: string) {
  return appRouter.createCaller({ req: { headers: token ? { 'x-airmesh-publisher-token': token } : {} }, res: {} } as never);
}

function authenticatedCaller() {
  return appRouter.createCaller({ req: { headers: {} }, res: {}, user: { id: 42 } } as never);
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALERT_INGESTION_TOKEN;
});

describe('India response foundation', () => {
  it('persists a bounded geo-targeted controlled alert through the authorized publisher route', async () => {
    process.env.ALERT_INGESTION_TOKEN = 'india-test-token';
    const create = vi.spyOn(db, 'createDisasterAlert').mockResolvedValue();
    await expect(publisherCaller('india-test-token').alerts.ingest({
      id: 'india-zone-1', title: 'Heat warning', summary: 'Use cooling centres where officially advised.', type: 'weather', severity: 'high', issuedAt: new Date(), originDeviceId: 'india-publisher', hazard: 'heatwave', locale: 'en-IN', target: { label: 'Ward 12', latitude: 28.6139, longitude: 77.209, radiusM: 1200 },
    })).resolves.toMatchObject({ accepted: true });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ hazard: 'heatwave', locale: 'en-IN', targetLabel: 'Ward 12', targetRadiusM: 1200 }));
  });

  it('rejects impossible target coordinates before durable storage', async () => {
    process.env.ALERT_INGESTION_TOKEN = 'india-test-token';
    const create = vi.spyOn(db, 'createDisasterAlert').mockResolvedValue();
    await expect(publisherCaller('india-test-token').alerts.ingest({
      id: 'india-zone-invalid', title: 'Flood warning', summary: 'Avoid waterlogged streets.', type: 'weather', severity: 'high', issuedAt: new Date(), originDeviceId: 'india-publisher', target: { label: 'Invalid', latitude: 91, longitude: 77, radiusM: 100 },
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(create).not.toHaveBeenCalled();
  });

  it('lets an authorized publisher update a targeted alert and mark it resolved', async () => {
    process.env.ALERT_INGESTION_TOKEN = 'india-test-token';
    const create = vi.spyOn(db, 'createDisasterAlert').mockResolvedValue();
    const resolve = vi.spyOn(db, 'resolveDisasterAlert').mockResolvedValue(true);
    await expect(publisherCaller('india-test-token').alerts.update({
      id: 'india-zone-1', title: 'Heat warning updated', summary: 'Use cooling centres and avoid afternoon travel.', type: 'weather', severity: 'critical', issuedAt: new Date(), originDeviceId: 'india-publisher', hazard: 'heatwave', locale: 'en-IN', target: { label: 'Ward 12', latitude: 28.6139, longitude: 77.209, radiusM: 1200 },
    })).resolves.toMatchObject({ accepted: true, status: 'active' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: 'india-zone-1', severity: 'critical', status: 'active' }));
    await expect(publisherCaller('india-test-token').alerts.resolve({ id: 'india-zone-1' })).resolves.toMatchObject({ accepted: true, status: 'resolved' });
    expect(resolve).toHaveBeenCalledWith('india-zone-1', expect.any(Date));
  });

  it('stores an authenticated rescue request without claiming dispatch and exposes unconfigured adapters', async () => {
    const create = vi.spyOn(db, 'createSafetyCheckIn').mockResolvedValue();
    await expect(authenticatedCaller().response.checkIn({ id: 'checkin-1', status: 'rescue_requested', deviceId: 'AM-123456', hazard: 'landslide', note: 'Need local assistance.', location: { latitude: 30.7333, longitude: 76.7794 } })).resolves.toEqual({ accepted: true, status: 'rescue_requested', dispatchRequested: false });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, status: 'rescue_requested', hazard: 'landslide', latitude: 30.7333 }));
    const readiness = await publisherCaller().response.providerReadiness();
    expect(readiness).toMatchObject({ country: 'IN', emergencyNumber: '112' });
    expect(readiness.adapters.some((adapter) => adapter.id === 'carrier-cell-broadcast' && adapter.status === 'not_configured')).toBe(true);
  });
});
