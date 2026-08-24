export type PrimaryDestination = "alerts" | "rescue" | "messages" | "settings";

export const PRIMARY_NAVIGATION: ReadonlyArray<{
  key: PrimaryDestination;
  icon: "warning-amber" | "health-and-safety" | "chat-bubble-outline" | "settings";
  label: string;
}> = [
  { key: "alerts", icon: "warning-amber", label: "Alerts" },
  { key: "rescue", icon: "health-and-safety", label: "Response" },
  { key: "messages", icon: "chat-bubble-outline", label: "Chat" },
  { key: "settings", icon: "settings", label: "Settings" },
];
