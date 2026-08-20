import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

describe('onboarding visual assets', () => {
  it('bundles the web-sourced onboarding photograph and documents its attribution', () => {
    const asset = resolve(root, 'assets/images/onboarding-hiker-phone.jpg');
    expect(existsSync(asset)).toBe(true);
    expect(statSync(asset).size).toBeLessThan(1_000_000);
    const attribution = readFileSync(resolve(root, 'docs/web-assets.md'), 'utf8');
    expect(attribution).toContain('John Farias');
    expect(attribution).toContain('15466921');
  });
});
