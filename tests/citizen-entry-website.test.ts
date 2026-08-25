import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("citizen-first entry and public website link", () => {
  it("keeps the Alert Command as the default app entry on every platform", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("function Home");
    expect(shell).toContain("return <AlertsCenter colors={colors} onNavigate={go}/>;");
    expect(shell).not.toContain("Platform.OS === 'web' ? <PublicProjectSite");
  });

  it("adds a top-bar website option while keeping authority as a secondary menu route", () => {
    const center = read("components/alerts-center.tsx");
    expect(center).toContain("Visit Sanket Response website");
    expect(center).toContain("PROJECT_WEBSITE_URL");
    expect(center).toContain("/website");
    expect(center).toContain('onNavigate?.("authority")');
    expect(center).toContain("Authority Console");
    expect(center).toContain('onNavigate?.("alerts")');
    expect(center).toContain('onNavigate?.("settings")');
    expect(center).toContain("Go to home Alert Command");
    expect(center).toContain("Open settings");
    expect(center).toContain("Open Sanket menu");
  });

  it("serves public information and release downloads from a dedicated website route", () => {
    const website = read("app/website.tsx");
    const publicSite = read("components/public-project-site.tsx");
    expect(website).toContain("PublicProjectSite");
    expect(website).toContain('router.replace("/")');
    expect(publicSite).toContain("Published Android releases");
    expect(publicSite).toContain("GitHub Releases page");
  });

  it("uses the Sanket identity consistently in the citizen command and browser companion", () => {
    const center = read("components/alerts-center.tsx");
    const companion = read("components/web-command-companion.tsx");
    expect(center).toContain("Sanket Response could not open this support link");
    expect(companion).toContain("Sanket response desk");
    expect(companion).not.toContain("Air-Mesh response desk");
  });
});
