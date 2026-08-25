import { describe, expect, it, vi, afterEach } from "vitest";

import { dashboardAlertState } from "../mobile/src/services/alert-dashboard-state";
import type { DisasterAlert } from "../mobile/src/types/security-data";
import * as db from "../server/db";
import { appRouter } from "../server/routers";

function publisherCaller(token?: string) {
  return appRouter.createCaller({ req: { headers: token ? { "x-airmesh-publisher-token": token } : {} }, res: {} } as never);
}

const issuedAt = new Date("2026-08-25T06:00:00.000Z");
const targetedAlert = {
  id: "rih-flood-ward-12",
  title: "Flood evacuation warning",
  summary: "Move away from the river and follow the published local evacuation instructions.",
  type: "evacuation",
  severity: "critical" as const,
  issuedAt,
  originDeviceId: "authorized-demo-publisher",
  hazard: "flood" as const,
  locale: "en-IN",
  target: { label: "Ward 12", latitude: 28.6139, longitude: 77.209, radiusM: 1200 },
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALERT_INGESTION_TOKEN;
});

describe("RIH-PS-016 mandatory demonstration scenarios", () => {
  it("publishes a high-severity emergency alert to the controlled alert service", async () => {
    process.env.ALERT_INGESTION_TOKEN = "rih-test-token";
    const create = vi.spyOn(db, "createDisasterAlert").mockResolvedValue();

    await expect(publisherCaller("rih-test-token").alerts.ingest(targetedAlert)).resolves.toMatchObject({ accepted: true, status: "active" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ severity: "critical", status: "active" }));
  });

  it("preserves the defined geographical area on a location-based alert", async () => {
    process.env.ALERT_INGESTION_TOKEN = "rih-test-token";
    const create = vi.spyOn(db, "createDisasterAlert").mockResolvedValue();

    await publisherCaller("rih-test-token").alerts.ingest(targetedAlert);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ targetLabel: "Ward 12", targetLatitude: 28.6139, targetLongitude: 77.209, targetRadiusM: 1200 }));
  });

  it("updates an active alert and stores the revised severity and instructions", async () => {
    process.env.ALERT_INGESTION_TOKEN = "rih-test-token";
    const create = vi.spyOn(db, "createDisasterAlert").mockResolvedValue();

    await expect(publisherCaller("rih-test-token").alerts.update({ ...targetedAlert, severity: "high", summary: "Water levels are falling; remain away from damaged roads." })).resolves.toMatchObject({ accepted: true, status: "active" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: targetedAlert.id, severity: "high", summary: "Water levels are falling; remain away from damaged roads." }));
  });

  it("marks an active alert resolved and removes it from the citizen active state", async () => {
    process.env.ALERT_INGESTION_TOKEN = "rih-test-token";
    vi.spyOn(db, "resolveDisasterAlert").mockResolvedValue(true);
    const resolvedAt = new Date("2026-08-25T06:15:00.000Z");

    await expect(publisherCaller("rih-test-token").alerts.resolve({ id: targetedAlert.id, resolvedAt })).resolves.toMatchObject({ accepted: true, status: "resolved", resolvedAt });
    const resolved: DisasterAlert = { id: targetedAlert.id, title: targetedAlert.title, summary: targetedAlert.summary, type: targetedAlert.type, severity: targetedAlert.severity, source: "controlled_publisher", issued_at: issuedAt.toISOString(), expires_at: null, status: "resolved", origin_device_id: targetedAlert.originDeviceId, acknowledged_at: null, resolved_at: resolvedAt.toISOString() };
    expect(dashboardAlertState(resolved)).toBe("resolved");
  });
});
