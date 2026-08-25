import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Air Mesh operator and public-site surfaces", () => {
  it("uses a distinct signed-in operator environment with a dedicated monitoring console", () => {
    const authority = read("components/authority-console.tsx");
    expect(authority).toContain("AIR MESH OPS");
    expect(authority).toContain("SEPARATE OPERATOR ENVIRONMENT");
    expect(authority).toContain("Monitoring console");
    expect(authority).toContain("MONITOR THE");
    expect(authority).toContain("INCIDENT LIFECYCLE.");
    expect(authority).toContain("Provider state");
    expect(authority).toContain("CONTROLLED SERVICE ONLINE");
    expect(authority).toContain("ISSUE A CLEAR");
    expect(authority).toContain("NEXT ACTION.");
  });

  it("presents a public browser site with About and a truthful release-download destination", () => {
    const site = read("components/public-project-site.tsx");
    const shell = read("app/(tabs)/index.tsx");
    const website = read("app/website.tsx");
    expect(site).toContain("ABOUT AIR MESH");
    expect(site).toContain("Published Android releases");
    expect(site).toContain("GitHub Releases page");
    expect(site).toContain("does not pretend that an unpublished APK exists");
    expect(site).toContain("https://github.com/alham-rizvi/Air-mesh/releases");
    expect(shell).toContain("return <AlertsCenter colors={colors} onNavigate={go}/>;");
    expect(website).toContain("PublicProjectSite");
    expect(website).toContain('router.replace("/")');
  });

  it("renames the installed product display without changing the established technical slug", () => {
    const config = read("app.config.ts");
    const tab = read("app/(tabs)/_layout.tsx");
    expect(config).toContain('appName: "Air Mesh"');
    expect(config).toContain('appSlug: "air-mesh"');
    expect(tab).toContain('title: "Air Mesh"');
  });
});
