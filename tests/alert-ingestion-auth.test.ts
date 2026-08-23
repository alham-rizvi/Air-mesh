import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";

describe("controlled alert publisher endpoint", () => {
  it("accepts only the configured publisher token when one is supplied", async () => {
    const caller = appRouter.createCaller({} as never);
    const configured = process.env.ALERT_INGESTION_TOKEN;

    if (!configured) {
      await expect(caller.alerts.publisherHealth({ token: "not-configured" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      return;
    }

    await expect(caller.alerts.publisherHealth({ token: configured })).resolves.toMatchObject({ accepted: true, mode: "controlled-ingestion" });
    await expect(caller.alerts.publisherHealth({ token: `${configured}-invalid` })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
