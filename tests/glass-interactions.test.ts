import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("glass command interactions", () => {
  it("keeps subtle hover, focus, and press transitions on the command metrics", () => {
    const source = readFileSync(resolve(process.cwd(), "components/alerts-center.tsx"), "utf8");
    expect(source).toContain("onHoverIn={() => animateTo(1)}");
    expect(source).toContain("onFocus={() => animateTo(1)}");
    expect(source).toContain("onPressIn={() => animateTo(0.55, 90)}");
    expect(source).toContain("useNativeDriver: true");
    expect(source).toContain("outputRange: [1, 1.018]");
  });
});
