import type { DisasterAlert } from "@/mobile/src/types/security-data";

export type DashboardAlertState = "active" | "acknowledged" | "expired";
export type DashboardStatusFilter = "all" | DashboardAlertState;

export function dashboardAlertState(alert: DisasterAlert, now = Date.now()): DashboardAlertState {
  if (alert.status === "acknowledged") return "acknowledged";
  if (alert.expires_at && Date.parse(alert.expires_at) <= now) return "expired";
  return "active";
}

export function filterDashboardAlerts(alerts: DisasterAlert[], query: string, status: DashboardStatusFilter, now = Date.now()): DisasterAlert[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return alerts.filter((alert) => {
    const matchesStatus = status === "all" || dashboardAlertState(alert, now) === status;
    if (!matchesStatus || !normalizedQuery) return matchesStatus;
    return [alert.id, alert.title, alert.summary, alert.type, alert.severity, alert.source, alert.origin_device_id]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}
