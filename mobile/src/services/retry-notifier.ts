/** Browser and deterministic-test fallback: retry telemetry remains local, with no system notification. */
export async function notifyPeerEligibleForRetry(_input: { peerId?: string; attempted: number }): Promise<boolean> { return false; }
