import { describe, expect, it } from 'vitest';
import { DEFAULT_RETRY_PREFERENCES, normalizeRetryPreferences } from '../mobile/src/services/retry-preferences';

describe('retry preferences', () => {
  it('accepts only supported automatic retry limits and intervals', () => {
    expect(normalizeRetryPreferences({ maxAttempts: 15, retryIntervalMinutes: 1 })).toEqual({ maxAttempts: 15, retryIntervalMinutes: 1 });
    expect(normalizeRetryPreferences({ maxAttempts: 99, retryIntervalMinutes: 2 })).toEqual(DEFAULT_RETRY_PREFERENCES);
  });
});
