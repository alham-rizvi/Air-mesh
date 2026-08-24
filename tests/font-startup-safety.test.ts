import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("font startup safety", () => {
  it("does not block the root layout on a runtime font-loader request", () => {
    const rootLayout = readFileSync(resolve(process.cwd(), "app/_layout.tsx"), "utf8");
    expect(rootLayout).not.toContain("useFonts");
    expect(rootLayout).not.toContain("fontsLoaded");
  });

  it("defines the Android Archivo Expanded family at build time", () => {
    const config = readFileSync(resolve(process.cwd(), "app.config.ts"), "utf8");
    expect(config).toContain('fontFamily: "ArchivoExpanded"');
    expect(config).toContain("ArchivoExpanded-ExtraBold.ttf");
  });
});
