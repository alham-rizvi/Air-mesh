import { describe, expect, it } from "vitest";

import { fetchOfficialCapXml, getOfficialFeedReadiness } from "../server/ndma-sachet-cap";

describe("official NDMA SACHET CAP feed boundary", () => {
  it("remains explicitly inactive without an approved feed identifier", async () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(getOfficialFeedReadiness(env)).toMatchObject({ provider: "NDMA SACHET CAP", state: "not_configured" });
    await expect(fetchOfficialCapXml({ env, fetcher: async () => { throw new Error("must not fetch"); } })).resolves.toMatchObject({ state: "not_configured" });
  });

  it("uses the provider identifier only server-side and preserves ETag cache semantics", async () => {
    const calls: Array<{ url: string; headers: HeadersInit | undefined }> = [];
    const response = await fetchOfficialCapXml({
      env: { NODE_ENV: "test", NDMA_SACHET_CAP_IDENTIFIER: "approved-alert-42" } as NodeJS.ProcessEnv,
      etag: '"known-version"',
      fetcher: async (url, init) => {
        calls.push({ url, headers: init.headers });
        return { ok: false, status: 304, headers: new Headers({ etag: '"known-version"' }), text: async () => "" };
      },
    });
    expect(response).toEqual({ state: "unchanged", etag: '"known-version"' });
    expect(calls[0].url).toContain("identifier=approved-alert-42");
    expect(calls[0].headers).toMatchObject({ "If-None-Match": '"known-version"' });
  });

  it("rejects a malformed or oversized CAP response rather than treating it as an alert", async () => {
    const result = await fetchOfficialCapXml({
      env: { NODE_ENV: "test", NDMA_SACHET_CAP_IDENTIFIER: "approved-alert-42" } as NodeJS.ProcessEnv,
      fetcher: async () => ({ ok: true, status: 200, headers: new Headers(), text: async () => "not XML" }),
    });
    expect(result).toMatchObject({ state: "unavailable" });
  });
});
