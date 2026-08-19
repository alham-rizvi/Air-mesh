import { create } from 'zustand';

export type ThemeMode = 'system' | 'dark' | 'light';
export type Role = 'User' | 'Shelter' | 'Courier' | 'Base';
export type Delivery = 'sent' | 'delivered' | 'read';

export type Chat = { id: string; name: string; initials: string; preview: string; time: string; unread: number; relay: string; online: boolean };
export type Message = { id: string; text: string; time: string; sent: boolean; delivery?: Delivery; relay?: string };
export type Contact = { id: string; name: string; initials: string; role: Role; distance: string; signal: number; lastSeen: string; nearby?: boolean };
export type Report = { id: string; shelter: string; time: string; people: number; needs: string[]; severity: 'Low' | 'Medium' | 'High'; status: 'Local' | 'Synced to Courier' | 'Synced to Base' };

export const mockChats: Chat[] = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', preview: 'We found a clear route east.', time: '09:42', unread: 2, relay: 'Via 2 relays', online: true },
  { id: 'north', name: 'North Shelter', initials: 'NS', preview: 'Water inventory updated.', time: '08:16', unread: 0, relay: 'Direct', online: true },
  { id: 'field', name: 'Field Team', initials: 'FT', preview: 'Via relay · 3 attachments', time: 'Yesterday', unread: 5, relay: 'Via 3 relays', online: false },
];

export const mockContacts: Contact[] = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', role: 'User', distance: '~80m', signal: 4, lastSeen: 'Active now' },
  { id: 'north', name: 'North Shelter', initials: 'NS', role: 'Shelter', distance: '~210m', signal: 3, lastSeen: '2 min ago' },
  { id: 'courier', name: 'Courier 07', initials: 'C7', role: 'Courier', distance: '~340m', signal: 2, lastSeen: '5 min ago', nearby: true },
  { id: 'base', name: 'Base Station', initials: 'BS', role: 'Base', distance: '~480m', signal: 1, lastSeen: '12 min ago', nearby: true },
];

export const mockReports: Report[] = [
  { id: 'r1', shelter: 'SH-001', time: 'Today · 09:18', people: 38, needs: ['Water', 'Medical'], severity: 'High', status: 'Local' },
  { id: 'r2', shelter: 'SH-004', time: 'Yesterday · 17:40', people: 21, needs: ['Food'], severity: 'Medium', status: 'Synced to Courier' },
  { id: 'r3', shelter: 'SH-002', time: 'Yesterday · 14:12', people: 16, needs: ['Shelter'], severity: 'Low', status: 'Synced to Base' },
];

export const useThemeStore = create<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void }>(((set) => ({ mode: 'dark', setMode: (mode) => set({ mode }) })));
export const useChatStore = create<{ chats: Chat[]; messages: Record<string, Message[]>; addMessage: (chatId: string, text: string) => void }>(((set) => ({
  chats: mockChats,
  messages: { maya: [{ id: '1', text: 'Are you receiving this?', time: '09:40', sent: false, relay: 'Via 2 relays' }, { id: '2', text: 'Loud and clear. Mesh is stable here.', time: '09:41', sent: true, delivery: 'read' }, { id: '3', text: 'We found a clear route east.', time: '09:42', sent: false, relay: 'Via 2 relays' }] },
  addMessage: (chatId, text) => set((state) => ({ messages: { ...state.messages, [chatId]: [...(state.messages[chatId] || []), { id: String(Date.now()), text, time: 'Now', sent: true, delivery: 'sent', relay: 'Via 2 relays' }] } })),
})));
export const useContactStore = create<{ contacts: Contact[] }>(() => ({ contacts: mockContacts }));
export const useReportStore = create<{ reports: Report[]; addReport: (report: Report) => void }>(((set) => ({ reports: mockReports, addReport: (report) => set((state) => ({ reports: [report, ...state.reports] })) })));
export const useSettingsStore = create<{ role: Role; bluetooth: boolean; wifi: boolean; relay: boolean; setRole: (role: Role) => void; toggle: (key: 'bluetooth' | 'wifi' | 'relay') => void }>(((set) => ({ role: 'User', bluetooth: true, wifi: true, relay: true, setRole: (role) => set({ role }), toggle: (key) => set((state) => ({ [key]: !state[key] })) })));
