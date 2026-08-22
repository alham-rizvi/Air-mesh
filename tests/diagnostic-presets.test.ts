import { describe, expect, it } from 'vitest';
import { normalizeDiagnosticPresets } from '../mobile/src/services/diagnostic-presets';

describe('diagnostic filter presets', () => {
  it('retains built-ins and accepts only bounded valid custom filters', () => {
    const presets = normalizeDiagnosticPresets([{ id: 'one', label: 'North relay', query: 'north' }, { id: 4, label: 'invalid', query: 'ignored' }, { id: 'dup', label: 'Peer duplicate', query: 'peer' }]);
    expect(presets.map((preset) => preset.query)).toEqual(['', 'relay', 'peer', 'north']);
  });
});
