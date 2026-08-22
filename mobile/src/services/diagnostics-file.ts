/** Web/test fallback: a local native diagnostics file cannot be created here. */
export async function shareDiagnosticsFile(_json: string): Promise<{ shared: false; reason: string }> { return { shared: false, reason: 'Native file sharing is unavailable in this runtime.' }; }
