import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("native urgent alert notification", () => {
  const source = readFileSync(resolve(process.cwd(), "mobile/src/services/alert-notifier.native.ts"), "utf8");

  it("requires the operating-system notification permission before scheduling an alert", () => {
    expect(source).toContain("Notifications.getPermissionsAsync()");
    expect(source).toContain("permission.status !== 'granted'");
  });

  it("uses an explicit high-importance Android channel with sound and vibration", () => {
    expect(source).toContain("urgent-disaster-alerts");
    expect(source).toContain("Notifications.AndroidImportance.MAX");
    expect(source).toContain("vibrationPattern: VIBRATION_PATTERN");
    expect(source).toContain("sound: 'default'");
    expect(source).toContain("shouldPlaySound: true");
  });
});
