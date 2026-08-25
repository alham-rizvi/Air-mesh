export const INDIA_HAZARDS = ["flood", "cyclone", "earthquake", "heatwave", "landslide", "wildfire", "lightning", "industrial", "other"] as const;
export type IndiaHazard = (typeof INDIA_HAZARDS)[number];

export const INDIA_RESPONSE_GUIDES = [
  { id: "first-aid", title: "First aid", summary: "Move away from immediate danger, call 112 when urgent help is needed, and use trained first-aid guidance when available." },
  { id: "go-bag", title: "Emergency supplies", summary: "Keep water, essential medicines, a torch, power bank, identification copies, and weather-appropriate clothing together." },
  { id: "after-alert", title: "After an alert", summary: "Follow official instructions, avoid damaged infrastructure, check in when safe, and do not return to a restricted area until cleared." },
] as const;

export const INDIA_PROVIDER_ADAPTERS = [
  { id: "erss-112", channel: "ERSS 112", protocol: "User-initiated tel:112 handoff", status: "user_initiated_only", detail: "The app opens the phone dialer; it does not dispatch an incident or represent ERSS." },
  { id: "ndma-cap", channel: "CAP / NDMA alerting", protocol: "Outbound HTTPS on port 443 with provider-issued mTLS or signed credentials", status: "not_configured", detail: "Requires official onboarding; no unofficial polling or alert injection is enabled." },
  { id: "carrier-cell-broadcast", channel: "Carrier cell broadcast", protocol: "Authorized carrier or government gateway only", status: "not_configured", detail: "No device-side API can send a public cell broadcast from this app." },
  { id: "sms", channel: "SMS gateway", protocol: "Provider HTTPS API on port 443", status: "not_configured", detail: "Requires a sender identity, provider account, rate limits, consent, and credentials held server-side." },
  { id: "media", channel: "Radio / TV / siren", protocol: "Authorized newsroom or municipal integration", status: "not_configured", detail: "The app exposes a future adapter boundary only; it does not control public infrastructure." },
  { id: "maps", channel: "Shelter and route maps", protocol: "Offline package plus authorized map and road-status provider", status: "not_configured", detail: "No live shelter occupancy, route, or blockage data is claimed until a provider is configured." },
  { id: "translation", channel: "Translation and speech", protocol: "Approved server-side translation provider", status: "not_configured", detail: "Locale-ready alert fields are supported, but no automatic translation is claimed yet." },
  { id: "sensors", channel: "Sensors and forecasting", protocol: "Authorized webhook or HTTPS feed on port 443", status: "not_configured", detail: "Prediction and sensor feeds remain disabled until data provenance and operating approval are established." },
] as const;

export type IndiaProviderAdapter = (typeof INDIA_PROVIDER_ADAPTERS)[number];
