import { describe, expect, it } from "vitest";

import { getSessionCookieOptions } from "../server/_core/cookies";

function request(protocol: string, headers: Record<string, string> = {}) {
  return { protocol, headers } as never;
}

describe("session cookie options", () => {
  it("handles an absent hostname without throwing and keeps HTTPS cookies secure", () => {
    expect(getSessionCookieOptions(request("https"))).toMatchObject({
      domain: undefined,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("uses host-only lax cookies for local HTTP and a parent domain for deployed subdomains", () => {
    expect(getSessionCookieOptions(request("http", { host: "localhost:3000" }))).toMatchObject({ domain: undefined, secure: false, sameSite: "lax" });
    expect(getSessionCookieOptions(request("https", { host: "3000-example.manus.space" }))).toMatchObject({ domain: ".manus.space", secure: true, sameSite: "none" });
  });
});
