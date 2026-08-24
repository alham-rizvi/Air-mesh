import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { acknowledgeLocalAlert, createLocalAlert, listLocalAlerts, subscribeToAlerts } from "@/mobile/src/services/alert-service";
import { notifyLocalAlert, requestLocalAlertPermission } from "@/mobile/src/services/alert-notifier";
import { ALERT_CATEGORIES, loadAlertCategories, saveAlertCategories, type AlertCategory } from "@/mobile/src/services/alert-preferences";
import type { DisasterAlert } from "@/mobile/src/types/security-data";

type Colors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string; onAccent?: string };

function severityColor(severity: DisasterAlert["severity"], accent: string) {
  return severity === "critical" ? "#FF5964" : severity === "high" ? "#FFB34D" : severity === "moderate" ? "#EACB5B" : accent;
}

export function AlertsCenter({ colors }: { colors: Colors }) {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [categories, setCategories] = useState<AlertCategory[]>(["safety", "evacuation"]);
  const remoteAlerts = trpc.alerts.list.useQuery({ limit: 50 }, { refetchInterval: 60_000 });
  const knownRemoteAlertIds = useRef(new Set<string>());
  const remoteInitialized = useRef(false);
  const refresh = useCallback(() => { void listLocalAlerts().then(setAlerts).catch(() => setAlerts([])); }, []);

  useEffect(() => {
    refresh();
    void loadAlertCategories().then(setCategories);
    return subscribeToAlerts((alert) => setAlerts((current) => [alert, ...current.filter((entry) => entry.id !== alert.id)]));
  }, [refresh]);

  useEffect(() => {
    const incoming = remoteAlerts.data ?? [];
    if (!remoteInitialized.current) {
      incoming.forEach((alert) => knownRemoteAlertIds.current.add(alert.id));
      remoteInitialized.current = true;
      return;
    }
    incoming.filter((alert) => !knownRemoteAlertIds.current.has(alert.id)).forEach((alert) => {
      knownRemoteAlertIds.current.add(alert.id);
      if (!categories.includes(alert.type as AlertCategory)) return;
      const presentation: DisasterAlert = { id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: "active", origin_device_id: alert.originDeviceId, acknowledged_at: null };
      Alert.alert(`${alert.severity.toUpperCase()} alert`, `${alert.title}\n\n${alert.summary}`);
      void notifyLocalAlert(presentation);
    });
  }, [categories, remoteAlerts.data]);

  const enableNotifications = async () => {
    const result = await requestLocalAlertPermission();
    setPermission(result);
    Alert.alert(
      result === "granted" ? "Alert notifications enabled" : result === "unsupported" ? "Native notifications unavailable here" : "Notifications not enabled",
      result === "granted"
        ? "Stored local alerts can now request device-tray presentation on this installed app."
        : "In-app alert presentation remains available. You can update native permission later in system settings.",
    );
  };

  const createTest = async () => {
    const { alert, notified } = await createLocalAlert({
      title: "Local disaster-alert test",
      summary: "This is an on-device test alert. It is not from a government, IoT, weather, or live external provider.",
      type: "test",
      severity: "high",
      source: "local_report",
    });
    setAlerts((current) => [alert, ...current.filter((entry) => entry.id !== alert.id)]);
    Alert.alert("Local alert created", notified ? "The alert is stored locally, visible in this inbox, and submitted to the device notification system." : "The alert is stored locally and visible in this inbox. Enable notifications to request device-tray presentation.");
  };

  const toggleCategory = async (category: AlertCategory) => {
    const next = categories.includes(category) ? categories.filter((value) => value !== category) : [...categories, category];
    const saved = await saveAlertCategories(next);
    setCategories(saved);
  };

  const serverAlerts: DisasterAlert[] = (remoteAlerts.data ?? []).map((alert) => ({ id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: "active", origin_device_id: alert.originDeviceId, acknowledged_at: null }));
  const mergedAlerts = [...alerts, ...serverAlerts.filter((remote) => !alerts.some((local) => local.id === remote.id))];
  const active = mergedAlerts.filter((alert) => alert.status === "active" && (alert.type === "test" || categories.includes(alert.type as AlertCategory)));

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.logo, { borderColor: colors.accent }]}><MaterialIcons name="warning-amber" size={18} color={colors.accent} /></View>
        <View><Text style={[styles.brand, { color: colors.text }]}>Air-Mesh</Text><Text style={[styles.micro, { color: colors.accent }]}>LOCAL ALERTS</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colors.accent }]}>DISASTER ALERT / OFFLINE COORDINATION</Text>
        <Text style={[styles.title, { color: colors.text }]}>Alerts that stay{`\n`}with your device.</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Local alert records are available offline. This build has no live official-feed connection; a controlled publisher endpoint is configured separately.</Text>
        <Text style={[styles.section, { color: colors.muted, marginTop: 18 }]}>ALERT TYPES</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Choose which controlled alert types may raise an in-app banner or native notification while Air-Mesh is active.</Text>
        <View style={styles.categoryGrid}>{ALERT_CATEGORIES.map((category) => <Pressable key={category} onPress={() => void toggleCategory(category)} style={({ pressed }) => [styles.category, { borderColor: categories.includes(category) ? colors.accent : colors.border, backgroundColor: categories.includes(category) ? colors.accent : "transparent", opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.categoryText, { color: categories.includes(category) ? (colors.onAccent ?? "#000") : colors.text }]}>{category}</Text></Pressable>)}</View>

        <View style={[styles.status, { backgroundColor: colors.field, borderColor: active.length ? severityColor(active[0].severity, colors.accent) : colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: active.length ? severityColor(active[0].severity, colors.accent) : colors.surface }]}><MaterialIcons name={active.length ? "notification-important" : "notifications-none"} size={22} color={active.length ? "#000" : colors.muted} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.micro, { color: active.length ? severityColor(active[0].severity, colors.accent) : colors.muted }]}>{active.length ? `${active.length} ACTIVE LOCAL ALERT${active.length === 1 ? "" : "S"}` : "NO ACTIVE LOCAL ALERTS"}</Text><Text style={[styles.caption, { color: colors.muted }]}>{active.length ? "Review and acknowledge local records below." : "Create a test alert to validate this device workflow."}</Text></View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => void createTest()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: pressed ? 0.86 : 1 }]}><MaterialIcons name="add-alert" size={17} color={colors.onAccent ?? "#000"} /><Text style={[styles.primaryText, { color: colors.onAccent ?? "#000" }]}>Test alert</Text></Pressable>
          <Pressable onPress={() => void enableNotifications()} style={({ pressed }) => [styles.secondary, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><MaterialIcons name="notifications-active" size={17} color={colors.accent} /><Text style={[styles.secondaryText, { color: colors.text }]}>{permission === "granted" ? "Alerts ready" : "Enable alerts"}</Text></Pressable>
        </View>
        <Text style={[styles.caption, { color: colors.muted, marginTop: 10 }]}>Notification status: {permission === "unknown" ? "not requested this session" : permission}. Permission is requested only when you select Enable alerts.</Text>
        <Text style={[styles.caption, { color: remoteAlerts.isError ? "#FFB34D" : colors.muted, marginTop: 4 }]}>{remoteAlerts.isLoading ? "Checking controlled alert service…" : remoteAlerts.isError ? "Controlled alert service unavailable. Local alerts remain available." : `Controlled alert service connected · ${serverAlerts.length} server alert${serverAlerts.length === 1 ? "" : "s"}`}</Text>

        <Text style={[styles.section, { color: colors.muted }]}>STORED ALERTS</Text>
        {mergedAlerts.length === 0 ? <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="inbox" size={23} color={colors.muted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Your local alert inbox is empty</Text><Text style={[styles.caption, { color: colors.muted, textAlign: "center" }]}>This is a real local empty state, not a placeholder feed.</Text></View> : mergedAlerts.map((alert) => {
          const color = severityColor(alert.severity, colors.accent);
          return <View key={alert.id} style={[styles.alert, { borderColor: color, backgroundColor: colors.surface }]}><View style={[styles.dot, { backgroundColor: color }]} /><View style={{ flex: 1 }}><Text style={[styles.micro, { color }]}>{alert.severity.toUpperCase()} · {alert.type.toUpperCase()} · {alert.source.replace("_", " ")}</Text><Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text><Text style={[styles.caption, { color: colors.muted }]}>{alert.summary}</Text><Text style={[styles.caption, { color: colors.muted, marginTop: 7 }]}>Stored {new Date(alert.issued_at).toLocaleString()} · {alert.status}</Text>{alert.status === "active" && <Pressable onPress={() => void acknowledgeLocalAlert(alert.id).then(refresh)} style={[styles.ack, { borderColor: colors.accent }]}><MaterialIcons name="done" size={14} color={colors.accent} /><Text style={[styles.ackText, { color: colors.accent }]}>Acknowledge</Text></Pressable>}</View></View>;
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  brand: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 }, micro: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  content: { padding: 18, paddingBottom: 32 }, kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.05, marginTop: 8, marginBottom: 9 },
  title: { fontSize: 31, lineHeight: 35, fontWeight: "900", letterSpacing: -1 }, body: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  status: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 22, flexDirection: "row", alignItems: "center", gap: 11 }, statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  caption: { fontSize: 12, lineHeight: 17 }, categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }, category: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, categoryText: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" }, actions: { flexDirection: "row", gap: 9, marginTop: 14 }, primary: { flex: 1, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, primaryText: { fontSize: 13, fontWeight: "900" }, secondary: { flex: 1, height: 43, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, secondaryText: { fontSize: 13, fontWeight: "800" },
  section: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginTop: 24, marginBottom: 9 }, empty: { minHeight: 130, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 7, padding: 18 }, emptyTitle: { fontSize: 14, fontWeight: "800" },
  alert: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", gap: 10 }, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 }, alertTitle: { fontSize: 15, fontWeight: "800", marginTop: 4, marginBottom: 4 }, ack: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginTop: 9 }, ackText: { fontSize: 12, fontWeight: "800" },
});
