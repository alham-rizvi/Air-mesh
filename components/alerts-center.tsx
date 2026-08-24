import { Alert, ImageBackground, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";

import { AlertsDashboard } from "@/components/alerts-dashboard";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { DISPLAY_FONT } from "@/lib/typography";
import { acknowledgeLocalAlert, createLocalAlert, listLocalAlerts, mirrorControlledAlert, subscribeToAlerts } from "@/mobile/src/services/alert-service";
import { notifyLocalAlert, requestLocalAlertPermission } from "@/mobile/src/services/alert-notifier";
import { ALERT_CATEGORIES, loadAlertCategories, saveAlertCategories, type AlertCategory } from "@/mobile/src/services/alert-preferences";
import type { DisasterAlert } from "@/mobile/src/types/security-data";

type Colors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string; onAccent?: string };

const ALERT_COMMAND_HERO = { uri: "https://images.unsplash.com/photo-1758404958502-44f156617bae?auto=format&fit=crop&w=1200&q=75" };

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
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    const records: DisasterAlert[] = (remoteAlerts.data ?? []).map((alert) => ({ id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: "active", origin_device_id: alert.originDeviceId, acknowledged_at: null }));
    if (!records.length) return;
    void Promise.all(records.map(mirrorControlledAlert)).then(refresh).catch(() => undefined);
  }, [refresh, remoteAlerts.data]);

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

  const acknowledge = (alertId: string) => {
    void acknowledgeLocalAlert(alertId).then(refresh).catch((error) => Alert.alert("Acknowledgement unavailable", error instanceof Error ? error.message : "The local alert record could not be acknowledged."));
  };

  const openSupportLink = (url: string) => {
    setMenuOpen(false);
    void Linking.openURL(url).catch(() => Alert.alert("Link unavailable", "Air-Mesh could not open this support link on this device."));
  };

  const serverAlerts: DisasterAlert[] = (remoteAlerts.data ?? []).map((alert) => ({ id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: "active", origin_device_id: alert.originDeviceId, acknowledged_at: null }));
  const mergedAlerts = [...alerts, ...serverAlerts.filter((remote) => !alerts.some((local) => local.id === remote.id))];
  const active = mergedAlerts.filter((alert) => alert.status === "active" && (alert.type === "test" || categories.includes(alert.type as AlertCategory)));

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <View style={[styles.logo, { borderColor: colors.accent }]}><MaterialIcons name="warning-amber" size={18} color={colors.accent} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.brand, { color: colors.text, fontFamily: DISPLAY_FONT }]}>Air-Mesh</Text><Text style={[styles.micro, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>ALERT COMMAND</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Air-Mesh menu" onPress={() => setMenuOpen(true)} style={({ pressed }) => [styles.menuButton, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}><MaterialIcons name="menu" size={23} color={colors.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ImageBackground source={ALERT_COMMAND_HERO} imageStyle={styles.heroImage} style={[styles.hero, { borderColor: colors.border, backgroundColor: "#050605" }]}>
          <View style={styles.heroShade} />
          <View style={styles.heroContent}>
            <View style={[styles.heroEyebrow, { borderColor: "rgba(255,255,255,0.2)" }]}><View style={[styles.pulse, { backgroundColor: colors.accent }]} /><Text style={[styles.heroEyebrowText, { fontFamily: DISPLAY_FONT }]}>DISASTER RESPONSE SYSTEM</Text></View>
            <Text style={[styles.heroTitle, { fontFamily: DISPLAY_FONT }]}>TRIAGE{`\n`}THE SIGNAL.</Text>
            <Text style={styles.heroCopy}>Review incoming notices, set device preferences, and retain your response record when networks fail.</Text>
            <View style={styles.heroFooter}><Text style={[styles.micro, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>LOCAL-FIRST · AUDITABLE</Text><MaterialIcons name="arrow-downward" size={16} color="#FFFFFF" /></View>
          </View>
        </ImageBackground>

        <View style={[styles.commandLine, { borderColor: colors.border, backgroundColor: colors.surface }]}><View style={[styles.commandIcon, { backgroundColor: active.length ? severityColor(active[0].severity, colors.accent) : colors.field }]}><MaterialIcons name={active.length ? "notification-important" : "verified-user"} size={18} color={active.length ? "#000" : colors.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.micro, { color: active.length ? severityColor(active[0].severity, colors.accent) : colors.accent, fontFamily: DISPLAY_FONT }]}>{active.length ? `${active.length} ACTION REQUIRED` : "SYSTEM READY"}</Text><Text style={[styles.commandText, { color: colors.text }]}>{active.length ? "Local alerts need a review." : "No local alert needs action."}</Text></View><Text style={[styles.commandTime, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>{remoteAlerts.isFetching ? "SYNCING" : "LOCAL"}</Text></View>
        <View style={styles.glassGrid}>
          <View style={[styles.glassBlock, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.055)" }]}><Text style={[styles.glassLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>ACTIVE</Text><Text style={[styles.glassValue, { color: colors.text, fontFamily: DISPLAY_FONT }]}>{active.length.toString().padStart(2, "0")}</Text></View>
          <View style={[styles.glassBlock, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.055)" }]}><Text style={[styles.glassLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>CHANNELS</Text><Text style={[styles.glassValue, { color: colors.text, fontFamily: DISPLAY_FONT }]}>{categories.length.toString().padStart(2, "0")}</Text></View>
          <View style={[styles.glassBlock, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.055)" }]}><Text style={[styles.glassLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>SOURCE</Text><Text style={[styles.glassSource, { color: remoteAlerts.isError ? "#FFB34D" : colors.accent, fontFamily: DISPLAY_FONT }]}>{remoteAlerts.isError ? "LOCAL" : "READY"}</Text></View>
        </View>

        <Text style={[styles.section, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>ALERT CHANNELS</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>Choose which controlled alert types can raise an in-app banner or native notification while Air-Mesh is active.</Text>
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

        <AlertsDashboard alerts={mergedAlerts} colors={colors} onAcknowledge={acknowledge} />
      </ScrollView>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={styles.menuSheetTop}><View><Text style={[styles.menuTitle, { color: colors.text, fontFamily: DISPLAY_FONT }]}>AIR-MESH</Text><Text style={[styles.micro, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>COMMAND MENU</Text></View><Pressable accessibilityLabel="Close menu" onPress={() => setMenuOpen(false)} style={styles.closeMenu}><MaterialIcons name="close" size={22} color={colors.muted} /></Pressable></View>
            <Text style={[styles.menuIntro, { color: colors.muted }]}>Local-first alert management and disaster coordination support.</Text>
            <Pressable onPress={() => openSupportLink("https://github.com/alham-rizvi/Air-mesh")} style={[styles.menuItem, { borderBottomColor: colors.border }]}><MaterialIcons name="account-tree" size={20} color={colors.accent} /><View style={{ flex: 1 }}><Text style={[styles.menuItemTitle, { color: colors.text }]}>Project</Text><Text style={[styles.caption, { color: colors.muted }]}>Review source and project status.</Text></View><MaterialIcons name="north-east" size={18} color={colors.muted} /></Pressable>
            <Pressable onPress={() => openSupportLink("https://github.com/alham-rizvi/Air-mesh/issues")} style={[styles.menuItem, { borderBottomColor: colors.border }]}><MaterialIcons name="support-agent" size={20} color={colors.accent} /><View style={{ flex: 1 }}><Text style={[styles.menuItemTitle, { color: colors.text }]}>Contact support</Text><Text style={[styles.caption, { color: colors.muted }]}>Open an issue with diagnostic details.</Text></View><MaterialIcons name="north-east" size={18} color={colors.muted} /></Pressable>
            <Pressable onPress={() => openSupportLink("https://github.com/alham-rizvi/Air-mesh/pulls")} style={styles.menuItem}><MaterialIcons name="merge" size={20} color={colors.accent} /><View style={{ flex: 1 }}><Text style={[styles.menuItemTitle, { color: colors.text }]}>Project changes</Text><Text style={[styles.caption, { color: colors.muted }]}>Review pull requests and planned work.</Text></View><MaterialIcons name="north-east" size={18} color={colors.muted} /></Pressable>
            <View style={[styles.menuRule, { backgroundColor: colors.border }]} /><Text style={[styles.caption, { color: colors.muted }]}>Native alert notifications require Android permission. Nearby delivery requires supported compatible devices and a real local route.</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { height: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: -0.7 }, micro: { fontSize: 10, fontWeight: "900", letterSpacing: 1.15 }, menuButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  content: { padding: 18, paddingBottom: 32 }, hero: { minHeight: 260, borderRadius: 22, overflow: "hidden", borderWidth: 1, marginTop: 2 }, heroImage: { opacity: 0.74, resizeMode: "cover" }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" }, heroContent: { flex: 1, minHeight: 260, justifyContent: "space-between", padding: 18 }, heroEyebrow: { alignSelf: "flex-start", flexDirection: "row", gap: 7, alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.55)" }, pulse: { width: 7, height: 7, borderRadius: 4 }, heroEyebrowText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, heroTitle: { color: "#FFFFFF", fontSize: 39, lineHeight: 38, fontWeight: "900", letterSpacing: -1.6, marginTop: 16 }, heroCopy: { color: "#D1D7CB", fontSize: 13, lineHeight: 19, maxWidth: "76%", marginTop: 12 }, heroFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  commandLine: { minHeight: 68, borderRadius: 16, borderWidth: 1, padding: 12, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }, commandIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, commandText: { fontSize: 13, fontWeight: "800", marginTop: 2 }, commandTime: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  status: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 18, flexDirection: "row", alignItems: "center", gap: 11 }, statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  glassGrid: { flexDirection: "row", gap: 8, marginTop: 10 }, glassBlock: { flex: 1, minHeight: 76, borderWidth: 1, borderRadius: 15, padding: 10, justifyContent: "space-between" }, glassLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.7 }, glassValue: { fontSize: 23, lineHeight: 24, fontWeight: "900", letterSpacing: -0.8 }, glassSource: { fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: -0.2 },
  caption: { fontSize: 12, lineHeight: 17 }, categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }, category: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, categoryText: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" }, actions: { flexDirection: "row", gap: 9, marginTop: 14 }, primary: { flex: 1, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, primaryText: { fontSize: 13, fontWeight: "900" }, secondary: { flex: 1, height: 43, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, secondaryText: { fontSize: 13, fontWeight: "800" },
  section: { fontSize: 10, fontWeight: "900", letterSpacing: 1.25, marginTop: 22, marginBottom: 9 }, empty: { minHeight: 130, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 7, padding: 18 }, emptyTitle: { fontSize: 14, fontWeight: "800" },
  alert: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", gap: 10 }, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 }, alertTitle: { fontSize: 15, fontWeight: "800", marginTop: 4, marginBottom: 4 }, ack: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginTop: 9 }, ackText: { fontSize: 12, fontWeight: "800" },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-start" }, menuSheet: { marginTop: 62, marginHorizontal: 12, borderRadius: 22, borderWidth: 1, padding: 16 }, menuSheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, menuTitle: { fontSize: 21, fontWeight: "900", letterSpacing: -0.9 }, closeMenu: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, menuIntro: { fontSize: 13, lineHeight: 18, marginTop: 13, marginBottom: 8 }, menuItem: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 }, menuItemTitle: { fontSize: 14, fontWeight: "900", marginBottom: 2 }, menuRule: { height: StyleSheet.hairlineWidth, marginVertical: 13 },
});
