import { resolve } from "node:path";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = resolve(root, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

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

  it("does not import a runtime Expo vector icon font in startup-visible source", () => {
    const source = ["app", "components"].flatMap((directory) => sourceFiles(resolve(process.cwd(), directory))).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(source).not.toContain("@expo/vector-icons");
    expect(source).not.toContain("useFonts");
    expect(source).toContain("vectorless-icon");
  });
});
