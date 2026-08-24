import type { DisasterAlert } from "@/mobile/src/types/security-data";

export type DashboardAlertState = "active" | "acknowledged" | "expired";

export function dashboardAlertState(alert: DisasterAlert, now = Date.now()): DashboardAlertState {
  if (alert.status === "acknowledged") return "acknowledged";
  if (alert.expires_at && Date.parse(alert.expires_at) <= now) return "expired";
  return "active";
}
