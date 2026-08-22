import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { parseRedactedSupportBundle, type ImportedSupportBundleSummary } from './support-bundle-import';

export async function importSupportBundleFile(): Promise<{ imported: boolean; reason?: string; summary?: ImportedSupportBundleSummary }> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return { imported: false, reason: 'Support-bundle import was canceled.' };
  const asset = result.assets[0];
  if ((asset.size ?? 0) > 256_000) return { imported: false, reason: 'Support bundle exceeds the 256 KB import limit.' };
  const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
  return { imported: true, summary: parseRedactedSupportBundle(raw) };
}
