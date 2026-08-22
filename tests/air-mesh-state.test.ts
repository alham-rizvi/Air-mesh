import { describe, expect, it } from 'vitest';
import { mockChats, mockContacts, mockReports, useAccountStore, useChatStore, useContactStore, useDeviceStore, useThemeStore } from '../lib/air-mesh-store';

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

  it('creates a local group and accepts a paired contact', () => {
    const contact = { id: 'contact-test', name: 'Peer One', initials: 'PO', role: 'User' as const, distance: 'Manual', signal: 0, lastSeen: 'Just now' };
    useContactStore.getState().addContact(contact);
    const directId = useChatStore.getState().addDirect(contact);
    const groupId = useChatStore.getState().addGroup('Response Team', [contact.id]);
    expect(useContactStore.getState().contacts[0]).toMatchObject({ id: contact.id, name: 'Peer One' });
    expect(useChatStore.getState().chats).toEqual(expect.arrayContaining([expect.objectContaining({ id: directId, name: 'Peer One', type: 'direct' }), expect.objectContaining({ id: groupId, name: 'Response Team', type: 'group', memberIds: [contact.id] })]));
  });

  it('shows queued, accepted, and delivered states as distinct local message transitions', () => {
    const chatId = useChatStore.getState().addGroup('Delivery states', []);
    const messageId = useChatStore.getState().addMessage(chatId, 'status-aware envelope');
    expect(useChatStore.getState().messages[chatId][0]).toMatchObject({ id: messageId, delivery: 'queued' });
    useChatStore.getState().updateDelivery(chatId, messageId, 'accepted');
    expect(useChatStore.getState().messages[chatId][0]).toMatchObject({ delivery: 'accepted' });
    useChatStore.getState().updateDelivery(chatId, messageId, 'delivered');
    expect(useChatStore.getState().messages[chatId][0]).toMatchObject({ delivery: 'delivered' });
  });

  it('clears local session data without reseeding fake content', () => {
    useAccountStore.getState().setAccount({ displayName: 'Reset Me', deviceId: 'AM-RESET', createdAt: '2026-08-20T00:00:00Z' });
    useContactStore.getState().addContact({ id: 'reset-peer', name: 'Reset Peer', initials: 'RP', role: 'User', distance: 'Manual', signal: 0, lastSeen: 'Just now' });
    useChatStore.getState().addGroup('Reset Group', ['reset-peer']);
    useAccountStore.getState().setAccount(null);
    useContactStore.getState().reset();
    useChatStore.getState().reset();
    expect(useAccountStore.getState().account).toBeNull();
    expect(useContactStore.getState().contacts).toHaveLength(0);
    expect(useChatStore.getState().chats).toHaveLength(0);
    expect(useChatStore.getState().messages).toEqual({});
  });

  it('accepts only supported Air-Mesh accent colors', () => {
    useThemeStore.getState().setAccent('#2F80ED');
    expect(useThemeStore.getState().accent).toBe('#2F80ED');
  });
});
