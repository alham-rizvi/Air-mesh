import type { MeshServiceApi, Report } from './types';

export interface ReportStore {
  getReports(filter?: { sync_status?: Report['sync_status'] }): Promise<Report[]>;
  saveReport(report: Report): Promise<void>;
  markReportsSynced(ids: string[], status: Report['sync_status']): Promise<void>;
}

export class CourierSyncService {
  constructor(private readonly mesh: MeshServiceApi, private readonly store: ReportStore) {}

  async syncReportsFromShelter(deviceId: string): Promise<Report[]> {
    const reports = await this.mesh.syncReportsFromShelter(deviceId);
    for (const report of reports) await this.store.saveReport({ ...report, sync_status: 'synced_to_courier' });
    return reports;
  }

  async syncReportsToBase(baseUrl?: string): Promise<boolean> {
    const reports = await this.store.getReports({ sync_status: 'local' });
    if (reports.length === 0) return true;
    const synced = await this.mesh.syncReportsToBase(reports, baseUrl);
    if (synced) await this.store.markReportsSynced(reports.map((report) => report.id), 'synced_to_base');
    return synced;
  }
}
