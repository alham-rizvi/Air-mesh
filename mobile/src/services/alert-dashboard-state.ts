import type { DisasterAlert } from "@/mobile/src/types/security-data";

export type DashboardAlertState = "active" | "acknowledged" | "resolved" | "expired";
export type DashboardStatusFilter = "all" | DashboardAlertState;
export type DashboardUrgencyFilter = "all" | "critical" | "high_or_critical";
export type DashboardSortOption = "newest" | "severity" | "expiry";

export function dashboardAlertState(alert: DisasterAlert, now = Date.now()): DashboardAlertState {
  if (alert.status === "acknowledged") return "acknowledged";
  if (alert.status === "resolved") return "resolved";
  if (alert.expires_at && Date.parse(alert.expires_at) <= now) return "expired";
  return "active";
}

function severityRank(severity: DisasterAlert["severity"]) {
  return severity === "critical" ? 4 : severity === "high" ? 3 : severity === "moderate" ? 2 : 1;
}

function safeTimestamp(value: string | null | undefined, fallback = 0) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function filterDashboardAlerts(alerts: DisasterAlert[], query: string, status: DashboardStatusFilter, urgencyOrNow: DashboardUrgencyFilter | number = "all", maybeNow = Date.now()): DisasterAlert[] {
  const urgency: DashboardUrgencyFilter = typeof urgencyOrNow === "number" ? "all" : urgencyOrNow;
  const now = typeof urgencyOrNow === "number" ? urgencyOrNow : maybeNow;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return alerts.filter((alert) => {
    const matchesStatus = status === "all" || dashboardAlertState(alert, now) === status;
    const matchesUrgency = urgency === "all" || alert.severity === "critical" || (urgency === "high_or_critical" && alert.severity === "high");
    if (!matchesStatus || !matchesUrgency || !normalizedQuery) return matchesStatus && matchesUrgency;
    return [alert.id, alert.title, alert.summary, alert.type, alert.severity, alert.source, alert.origin_device_id, alert.hazard, alert.target_label, alert.locale]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

/** Returns a copy so dashboard sort controls never mutate durable local record arrays. */
export function sortDashboardAlerts(alerts: DisasterAlert[], sort: DashboardSortOption, now = Date.now()): DisasterAlert[] {
  return [...alerts].sort((left, right) => {
    if (sort === "severity") {
      const severityDifference = severityRank(right.severity) - severityRank(left.severity);
      if (severityDifference) return severityDifference;
    }
    if (sort === "expiry") {
      const leftExpiry = safeTimestamp(left.expires_at, Number.MAX_SAFE_INTEGER);
      const rightExpiry = safeTimestamp(right.expires_at, Number.MAX_SAFE_INTEGER);
      const expiryDifference = leftExpiry - rightExpiry;
      if (expiryDifference) return expiryDifference;
    }
    const issuedDifference = safeTimestamp(right.issued_at, now) - safeTimestamp(left.issued_at, now);
    return issuedDifference || left.id.localeCompare(right.id);
  });
}
