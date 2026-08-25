const SACHET_CAP_ENDPOINT = "https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile";
const MAX_CAP_XML_BYTES = 512_000;
const REQUEST_TIMEOUT_MS = 10_000;

export type OfficialFeedReadiness = {
  provider: "NDMA SACHET CAP";
  state: "not_configured" | "ready_for_authorized_polling";
  detail: string;
};

export type CapFeedResult =
  | { state: "not_configured"; detail: string }
  | { state: "unchanged"; etag: string | null }
  | { state: "updated"; etag: string | null; xml: string }
  | { state: "unavailable"; detail: string };

type FetchResponse = Pick<Response, "ok" | "status" | "headers" | "text">;
type FetchLike = (input: string, init: RequestInit) => Promise<FetchResponse>;

function configuredIdentifier(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env.NDMA_SACHET_CAP_IDENTIFIER?.trim();
  if (!value || value.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(value)) return null;
  return value;
}

export function getOfficialFeedReadiness(env: NodeJS.ProcessEnv = process.env): OfficialFeedReadiness {
  return configuredIdentifier(env)
    ? { provider: "NDMA SACHET CAP", state: "ready_for_authorized_polling", detail: "An approved CAP identifier is configured server-side. Alerts are not published until CAP XML validation and controlled ingestion succeed." }
    : { provider: "NDMA SACHET CAP", state: "not_configured", detail: "An approved SACHET CAP identifier and permitted-use confirmation are required before Air-Mesh can read the official feed." };
}

export async function fetchOfficialCapXml({
  etag,
  fetcher = fetch,
  env = process.env,
}: {
  etag?: string | null;
  fetcher?: FetchLike;
  env?: NodeJS.ProcessEnv;
} = {}): Promise<CapFeedResult> {
  const identifier = configuredIdentifier(env);
  if (!identifier) return { state: "not_configured", detail: getOfficialFeedReadiness(env).detail };

  const headers: Record<string, string> = { Accept: "application/xml, text/xml;q=0.9" };
  if (etag && etag.length <= 512) headers["If-None-Match"] = etag;

  try {
    const source = new URL(SACHET_CAP_ENDPOINT);
    source.searchParams.set("identifier", identifier);
    const response = await fetcher(source.toString(), { method: "GET", headers, redirect: "error", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const nextEtag = response.headers.get("etag");
    if (response.status === 304) return { state: "unchanged", etag: nextEtag ?? etag ?? null };
    if (!response.ok) return { state: "unavailable", detail: `Official CAP feed returned HTTP ${response.status}.` };
    const xml = await response.text();
    if (!xml.trim().startsWith("<") || xml.length > MAX_CAP_XML_BYTES) return { state: "unavailable", detail: "Official CAP feed returned an invalid or oversized XML response." };
    return { state: "updated", etag: nextEtag, xml };
  } catch {
    return { state: "unavailable", detail: "Official CAP feed could not be reached. Existing local alerts remain available." };
  }
}
