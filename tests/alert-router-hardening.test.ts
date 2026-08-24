import { afterEach, describe, expect, it, vi } from "vitest";

import * as db from "../server/db";
import { appRouter } from "../server/routers";

function caller(token?: string) {
  return appRouter.createCaller({
    req: { headers: token ? { "x-airmesh-publisher-token": token } : {} },
    res: {},
  } as never);
}

const validAlert = {
  id: "publisher-alert-1",
  title: "  Road closure  ",
  summary: "  A controlled publisher reports a local road closure.  ",
  type: "  safety  ",
  severity: "high" as const,
  issuedAt: new Date("2026-08-24T00:00:00.000Z"),
  originDeviceId: "  publisher-1  ",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALERT_INGESTION_TOKEN;
});

describe("controlled alert router hardening", () => {
  it("accepts a publisher header, trims payload values, and never requires a body token", async () => {
    process.env.ALERT_INGESTION_TOKEN = "unit-test-publisher-token";
    const create = vi.spyOn(db, "createDisasterAlert").mockResolvedValue();
    await expect(caller("unit-test-publisher-token").alerts.ingest(validAlert)).resolves.toMatchObject({ accepted: true });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Road closure",
      summary: "A controlled publisher reports a local road closure.",
      type: "safety",
      originDeviceId: "publisher-1",
      source: "controlled_publisher",
    }));
  });

  it("rejects blank identifiers before storage and reports a degraded controlled service without leaking database details", async () => {
    await expect(caller().alerts.ingest({ ...validAlert, id: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    vi.spyOn(db, "listDisasterAlerts").mockRejectedValue(new Error("connection refused"));
    await expect(caller().alerts.list({ limit: 10 })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "Controlled alert service unavailable." });
  });
});
