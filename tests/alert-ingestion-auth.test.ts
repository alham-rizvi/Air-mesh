import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";

function publisherCaller(token?: string) {
  return appRouter.createCaller({
    req: { headers: token ? { "x-airmesh-publisher-token": token } : {} },
    res: {},
  } as never);
}

describe("controlled alert publisher endpoint", () => {
  it("accepts only the configured publisher token when one is supplied", async () => {
    const caller = appRouter.createCaller({} as never);
    const configured = process.env.ALERT_INGESTION_TOKEN;

    if (!configured) {
      await expect(caller.alerts.publisherHealth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      return;
    }

    await expect(publisherCaller(configured).alerts.publisherHealth()).resolves.toMatchObject({ accepted: true, mode: "controlled-ingestion" });
    await expect(publisherCaller(`${configured}-invalid`).alerts.publisherHealth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
