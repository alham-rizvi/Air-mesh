import { describe, expect, it } from 'vitest';
import { PRIMARY_NAVIGATION } from '../lib/primary-navigation';

describe('primary disaster-response navigation', () => {
  it('keeps Alerts first and Chat second-to-last', () => {
    expect(PRIMARY_NAVIGATION.map((destination) => destination.key)).toEqual(['alerts', 'rescue', 'messages', 'settings']);
    expect(PRIMARY_NAVIGATION[0]).toMatchObject({ label: 'Alerts' });
    expect(PRIMARY_NAVIGATION[PRIMARY_NAVIGATION.length - 2]).toMatchObject({ label: 'Chat' });
  });
});
