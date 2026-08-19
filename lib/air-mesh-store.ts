import { create } from 'zustand';

export type ThemeMode = 'system' | 'dark' | 'light';
export type AccentColor = '#10A37F' | '#2F80ED' | '#8E5CF6' | '#D97706';
export type Role = 'User' | 'Shelter' | 'Courier' | 'Base';
export type Delivery = 'sent' | 'delivered' | 'read';

export type Chat = { id: string; name: string; initials: string; preview: string; time: string; unread: number; relay: string; online: boolean; type?: 'direct' | 'group'; memberIds?: string[] };
export type Message = { id: string; text: string; time: string; sent: boolean; delivery?: Delivery; relay?: string };
export type Contact = { id: string; name: string; initials: string; role: Role; distance: string; signal: number; lastSeen: string; nearby?: boolean; deviceId?: string; publicKey?: string };
export type Report = { id: string; shelter: string; time: string; people: number; needs: string[]; severity: 'Low' | 'Medium' | 'High'; status: 'Local' | 'Synced to Courier' | 'Synced to Base' };

export const mockChats: Chat[] = [];
export const mockContacts: Contact[] = [];
export const mockReports: Report[] = [];

export const useThemeStore = create<{ mode: ThemeMode; accent: AccentColor; setMode: (mode: ThemeMode) => void; setAccent: (accent: AccentColor) => void }>(((set) => ({ mode: 'dark', accent: '#10A37F', setMode: (mode) => set({ mode }), setAccent: (accent) => set({ accent }) })));
export type LocalAccount = { displayName: string; deviceId: string; createdAt: string };
export const useAccountStore = create<{ account: LocalAccount | null; setAccount: (account: LocalAccount) => void }>(((set) => ({ account: null, setAccount: (account) => set({ account }) })));
export const useDeviceStore = create<{ permissionStatus: 'unknown' | 'granted' | 'denied' | 'unsupported'; platform: string; model: string; setPermissionStatus: (status: 'unknown' | 'granted' | 'denied' | 'unsupported') => void; setDevice: (platform: string, model: string) => void }>(((set) => ({ permissionStatus: 'unknown', platform: 'unknown', model: 'unknown', setPermissionStatus: (permissionStatus) => set({ permissionStatus }), setDevice: (platform, model) => set({ platform, model }) })));
export const useChatStore = create<{ chats: Chat[]; messages: Record<string, Message[]>; addMessage: (chatId: string, text: string) => void; addGroup: (name: string, memberIds: string[]) => string }>(((set) => ({
  chats: mockChats,
  messages: {},
  addMessage: (chatId, text) => set((state) => ({ messages: { ...state.messages, [chatId]: [...(state.messages[chatId] || []), { id: String(Date.now()), text, time: 'Now', sent: true, delivery: 'sent', relay: 'Via 2 relays' }] } })),
  addGroup: (name, memberIds) => { const id = `group-${Date.now()}`; const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); set((state) => ({ chats: [{ id, name, initials, preview: 'Group created locally', time: 'Now', unread: 0, relay: 'Local only', online: false, type: 'group', memberIds }, ...state.chats] })); return id; },
})));
export const useContactStore = create<{ contacts: Contact[]; addContact: (contact: Contact) => void }>((set) => ({ contacts: mockContacts, addContact: (contact) => set((state) => ({ contacts: [contact, ...state.contacts.filter((existing) => existing.id !== contact.id)] })) }));
export const useReportStore = create<{ reports: Report[]; addReport: (report: Report) => void }>(((set) => ({ reports: mockReports, addReport: (report) => set((state) => ({ reports: [report, ...state.reports] })) })));
export const useSettingsStore = create<{ role: Role; bluetooth: boolean; wifi: boolean; relay: boolean; setRole: (role: Role) => void; toggle: (key: 'bluetooth' | 'wifi' | 'relay') => void }>(((set) => ({ role: 'User', bluetooth: false, wifi: false, relay: false, setRole: (role) => set({ role }), toggle: (key) => set((state) => ({ [key]: !state[key] })) })));
