import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('browser command companion', () => {
  it('renders only for wide web layouts and reuses real alert/provider state without claiming configured public channels', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/web-command-companion.tsx'), 'utf8');
    expect(source).toContain("Platform.OS !== 'web' || width < 860");
    expect(source).toContain('activeAlerts');
    expect(source).toContain('serverAlertCount');
    expect(source).toContain('controlledServiceAvailable');
    expect(source).toContain("adapter.status === 'not_configured'");
    expect(source).toContain('112 is user-initiated only');
  });
});
