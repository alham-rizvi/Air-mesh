import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

describe('onboarding visual assets', () => {
  it('bundles the web-sourced onboarding photograph and documents its attribution', () => {
    expect(existsSync(resolve(root, 'assets/images/onboarding-hiker-phone.jpg'))).toBe(true);
    const attribution = readFileSync(resolve(root, 'docs/web-assets.md'), 'utf8');
    expect(attribution).toContain('John Farias');
    expect(attribution).toContain('15466921');
  });
});
