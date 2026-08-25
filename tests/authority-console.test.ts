import { afterEach, describe, expect, it, vi } from "vitest";

import * as db from "../server/db";
import { appRouter } from "../server/routers";

const input = {
  id: "authority-console-flood",
  title: "Move away from the river",
  summary: "Residents in the target area should move to higher ground and follow verified local directions.",
  type: "evacuation",
  severity: "critical" as const,
  issuedAt: new Date("2026-08-25T07:00:00.000Z"),
  originDeviceId: "authority-console",
  hazard: "flood" as const,
  locale: "en-IN",
  target: { label: "Ward 12", latitude: 28.6139, longitude: 77.209, radiusM: 1200 },
};

function caller(role: "user" | "admin") {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 7, openId: "operator-7", name: "Operator", email: "operator@example.test", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  } as never);
}

afterEach(() => vi.restoreAllMocks());

describe("Authority Console", () => {
  it("keeps controlled authority mutations restricted to an admin operator session", async () => {
    await expect(caller("user").authority.publish(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an authorized operator to publish a geo-targeted controlled alert without a bundled publisher token", async () => {
    const create = vi.spyOn(db, "createDisasterAlert").mockResolvedValue();
    await expect(caller("admin").authority.publish(input)).resolves.toMatchObject({ accepted: true, status: "active" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: input.id, originDeviceId: "operator:7", targetLabel: "Ward 12", targetRadiusM: 1200, status: "active" }));
  });

  it("rejects a future-dated alert update on both publisher and authority paths", async () => {
    const future = { ...input, issuedAt: new Date(Date.now() + (6 * 60 * 1000)) };
    process.env.ALERT_INGESTION_TOKEN = "test-token";
    const publisher = appRouter.createCaller({ req: { headers: { "x-airmesh-publisher-token": "test-token" } }, res: {} } as never);
    await expect(publisher.alerts.update(future)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller("admin").authority.update(future)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    delete process.env.ALERT_INGESTION_TOKEN;
  });

  it("exposes a visible APK Authority Console entry and suppresses resolved remote banners", async () => {
    const { readFileSync } = await import("node:fs");
    const center = readFileSync("components/alerts-center.tsx", "utf8");
    const banner = readFileSync("components/global-alert-banner.tsx", "utf8");
    const shell = readFileSync("app/(tabs)/index.tsx", "utf8");
    expect(center).toContain("Authority Console");
    expect(center).toContain('onNavigate?.("authority")');
    expect(shell).toContain("AuthorityConsole");
    expect(shell).toContain("detail === 'authority'");
    expect(banner).toContain('item.status !== "resolved"');
  });
});
