import AsyncStorage from '@react-native-async-storage/async-storage';

export type DiagnosticFilterPreset = { id: string; label: string; query: string; builtIn?: boolean };
const STORAGE_KEY = 'airmesh.diagnostics.filter-presets';
const BUILT_INS: DiagnosticFilterPreset[] = [{ id: 'all', label: 'All network', query: '', builtIn: true }, { id: 'relays', label: 'Relays', query: 'relay', builtIn: true }, { id: 'peers', label: 'Peers', query: 'peer', builtIn: true }];

export function normalizeDiagnosticPresets(value: unknown): DiagnosticFilterPreset[] {
  const entries = Array.isArray(value) ? value : [];
  const custom = entries.filter((entry): entry is DiagnosticFilterPreset => Boolean(entry && typeof entry === 'object' && typeof (entry as DiagnosticFilterPreset).id === 'string' && typeof (entry as DiagnosticFilterPreset).label === 'string' && typeof (entry as DiagnosticFilterPreset).query === 'string')).map((entry) => ({ id: entry.id.slice(0, 48), label: entry.label.trim().slice(0, 32), query: entry.query.trim().slice(0, 48) })).filter((entry) => entry.label && entry.query).slice(0, 8);
  return [...BUILT_INS, ...custom.filter((entry) => !BUILT_INS.some((builtIn) => builtIn.query === entry.query))];
}

export async function loadDiagnosticPresets(): Promise<DiagnosticFilterPreset[]> { try { return normalizeDiagnosticPresets(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]')); } catch { return [...BUILT_INS]; } }
export async function saveDiagnosticPreset(query: string): Promise<DiagnosticFilterPreset[]> { const normalized = query.trim().slice(0, 48); if (!normalized) return loadDiagnosticPresets(); const current = await loadDiagnosticPresets(); if (current.some((preset) => preset.query.toLowerCase() === normalized.toLowerCase())) return current; const next = [...current, { id: `custom-${Date.now()}`, label: `“${normalized}”`, query: normalized }].slice(0, BUILT_INS.length + 8); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((preset) => !preset.builtIn))); return next; }
