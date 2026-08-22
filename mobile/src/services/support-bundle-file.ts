import type { ImportedSupportBundleSummary } from './support-bundle-import';

export async function importSupportBundleFile(): Promise<{ imported: false; reason: string; summary?: ImportedSupportBundleSummary }> { return { imported: false, reason: 'Native file import is unavailable in this runtime.' }; }
