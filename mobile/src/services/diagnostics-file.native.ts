import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareDiagnosticsFile(json: string): Promise<{ shared: boolean; reason?: string; uri?: string }> {
  if (!(await Sharing.isAvailableAsync())) return { shared: false, reason: 'The native share sheet is unavailable on this device.' };
  const directory = FileSystem.cacheDirectory;
  if (!directory) return { shared: false, reason: 'No temporary export directory is available.' };
  const uri = `${directory}air-mesh-diagnostics-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { dialogTitle: 'Export Air-Mesh diagnostics', mimeType: 'application/json', UTI: 'public.json' });
  return { shared: true, uri };
}
