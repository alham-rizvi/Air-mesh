import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@/components/ui/vectorless-icon";
import { useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc";
import { subscribeToAlerts } from "@/mobile/src/services/alert-service";
import { notifyLocalAlert } from "@/mobile/src/services/alert-notifier";
import { loadAlertCategories, type AlertCategory } from "@/mobile/src/services/alert-preferences";
import type { DisasterAlert } from "@/mobile/src/types/security-data";

export function GlobalAlertBanner() {
  const [alert, setAlert] = useState<DisasterAlert | null>(null);
  const categories = useRef<AlertCategory[]>(["safety", "evacuation"]);
  const seen = useRef(new Set<string>());
  const remoteInitialized = useRef(false);
  const remote = trpc.alerts.list.useQuery({ limit: 50 }, { refetchInterval: 60_000 });

  useEffect(() => { void loadAlertCategories().then((value) => { categories.current = value; }); }, []);
  useEffect(() => subscribeToAlerts((next) => { setAlert(next); }), []);
  useEffect(() => {
    const items = remote.data ?? [];
    if (!remoteInitialized.current) {
      items.forEach((item) => seen.current.add(item.id));
      remoteInitialized.current = true;
      return;
    }
    const unseen = items.find((item) => item.status !== "resolved" && !seen.current.has(item.id) && categories.current.includes(item.type as AlertCategory));
    if (!unseen) return;
    seen.current.add(unseen.id);
    const next: DisasterAlert = { id: unseen.id, title: unseen.title, summary: unseen.summary, type: unseen.type, severity: unseen.severity, source: unseen.source, issued_at: new Date(unseen.issuedAt).toISOString(), expires_at: unseen.expiresAt ? new Date(unseen.expiresAt).toISOString() : null, status: unseen.status === "resolved" ? "resolved" : "active", origin_device_id: unseen.originDeviceId, acknowledged_at: null, resolved_at: unseen.resolvedAt ? new Date(unseen.resolvedAt).toISOString() : null };
    setAlert(next);
    void notifyLocalAlert(next);
  }, [remote.data]);

  if (!alert) return null;
  const color = alert.severity === "critical" ? "#FF5964" : alert.severity === "high" ? "#FFB34D" : "#14B8A6";
  return <View style={[styles.wrap, { borderColor: color }]}><MaterialIcons name="notification-important" size={18} color={color} /><View style={{ flex: 1 }}><Text style={styles.title}>{alert.severity.toUpperCase()} · {alert.title}</Text><Text numberOfLines={2} style={styles.detail}>{alert.summary}</Text></View><Pressable accessibilityLabel="Dismiss alert banner" onPress={() => setAlert(null)} style={styles.dismiss}><MaterialIcons name="close" size={18} color="#FFFFFF" /></Pressable></View>;
}

const styles = StyleSheet.create({ wrap: { position: "absolute", top: 54, left: 12, right: 12, zIndex: 50, borderWidth: 1, borderRadius: 14, backgroundColor: "#10120D", padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }, title: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" }, detail: { color: "#D7DDCA", fontSize: 11, lineHeight: 15, marginTop: 2 }, dismiss: { padding: 2 } });
