import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Air Mesh visible branding", () => {
  it("uses Air Mesh as the installed-app name while preserving the technical slug", () => {
    const config = read("app.config.ts");
    expect(config).toContain('appName: "Air Mesh"');
    expect(config).toContain('appSlug: "air-mesh"');
  });

  it("uses Air Mesh on the citizen command, launch surface, companion, and public website", () => {
    const center = read("components/alerts-center.tsx");
    const onboarding = read("components/onboarding-visual.tsx");
    const companion = read("components/web-command-companion.tsx");
    const site = read("components/public-project-site.tsx");
    expect(center).toContain("Visit Air Mesh website");
    expect(center).toContain("AIR MESH");
    expect(onboarding).toContain("Air Mesh keeps you connected.");
    expect(companion).toContain("Air Mesh response desk");
    expect(site).toContain("ABOUT AIR MESH");
  });
});
