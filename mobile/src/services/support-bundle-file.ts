import type { ImportedSupportBundle } from './support-bundle-import';

export async function importSupportBundleFile(): Promise<{ imported: false; reason: string; bundle?: ImportedSupportBundle }> { return { imported: false, reason: 'Native file import is unavailable in this runtime.' }; }
