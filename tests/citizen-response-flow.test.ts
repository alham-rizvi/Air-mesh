import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("citizen-first disaster-response flow", () => {
  it("keeps the primary alert actions focused on safety, help, and incident reporting", () => {
    const alertCenter = read("components/alerts-center.tsx");
    expect(alertCenter).toContain("Safety & evacuation");
    expect(alertCenter).toContain("I’m safe");
    expect(alertCenter).toContain("Need help");
    expect(alertCenter).toContain("Report incident");
    expect(alertCenter).toContain('onNavigate?.("india-response")');
    expect(alertCenter).toContain('onNavigate?.("report")');
    expect(alertCenter).toContain("testAlertFeedback");
    expect(alertCenter).toContain("await requestLocalAlertPermission()");
    expect(alertCenter).toContain("Android requested the device alert sound and vibration");
    expect(alertCenter).toContain("Browser preview cannot play the Android alert buzzer");
  });

  it("routes the report action to the citizen incident form and the response actions to the response workspace", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("CitizenIncidentForm");
    expect(shell).toContain("detail === 'india-response'");
    expect(shell).toContain("dashboard not connected");
  });

  it("opens the direct alert dashboard without making a local identity a prerequisite", () => {
    const shell = read("app/(tabs)/index.tsx");
    expect(shell).toContain("const localIdentity = account ??");
    expect(shell).toContain("Local user");
    expect(shell).not.toContain("if(!account) return <AccountSetup");
    expect(shell).not.toContain("if (!account) return <AccountSetup");
  });

  it("saves reports locally and does not present an unconfigured dashboard as an operator receipt", () => {
    const form = read("components/citizen-incident-form.tsx");
    expect(form).toContain("Saved on this device");
    expect(form).toContain("website dashboard is not connected yet");
    expect(form).toContain("dashboard_handoff: \"not_configured\"");
    expect(form).toContain("saveLocalReport(report)");
  });

  it("labels saved-alert filtering honestly instead of implying a live provider search", () => {
    const dashboard = read("components/alerts-dashboard.tsx");
    expect(dashboard).toContain("SAVED ALERTS ON THIS DEVICE");
    expect(dashboard).toContain("Find a saved alert");
    expect(dashboard).toContain("It does not search government or internet alert feeds.");
  });
});
