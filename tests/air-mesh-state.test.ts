import { describe, expect, it } from 'vitest';
import { mockChats, mockContacts, mockReports, useAccountStore, useDeviceStore, useThemeStore } from '../lib/air-mesh-store';

describe('Air-Mesh offline foundation', () => {
  it('does not ship seeded fake peer data', () => {
    expect(mockChats).toHaveLength(0);
    expect(mockContacts).toHaveLength(0);
    expect(mockReports).toHaveLength(0);
  });

  it('supports local account and device readiness state', () => {
    const account = { displayName: 'Test Responder', deviceId: 'AM-TEST', createdAt: '2026-08-20T00:00:00Z' };
    useAccountStore.getState().setAccount(account);
    useDeviceStore.getState().setDevice('Android', 'Test device');
    expect(useAccountStore.getState().account).toEqual(account);
    expect(useDeviceStore.getState().platform).toBe('Android');
  });

  it('accepts only supported Air-Mesh accent colors', () => {
    useThemeStore.getState().setAccent('#2F80ED');
    expect(useThemeStore.getState().accent).toBe('#2F80ED');
  });
});
