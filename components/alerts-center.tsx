import { Alert, Animated, ImageBackground, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@/components/ui/vectorless-icon";
import { useCallback, useEffect, useRef, useState } from "react";

import { AlertsDashboard } from "@/components/alerts-dashboard";
import { WebCommandCompanion } from "@/components/web-command-companion";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { DISPLAY_FONT } from "@/lib/typography";
import { auditService } from "@/mobile/src/services/auditService";
import { acknowledgeLocalAlert, createLocalAlert, listLocalAlerts, mirrorControlledAlerts, subscribeToAlerts } from "@/mobile/src/services/alert-service";
import { notifyLocalAlert, requestLocalAlertPermission } from "@/mobile/src/services/alert-notifier";
import { ALERT_CATEGORIES, loadAlertCategories, saveAlertCategories, type AlertCategory } from "@/mobile/src/services/alert-preferences";
import type { DisasterAlert } from "@/mobile/src/types/security-data";

type Colors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string; onAccent?: string };

function severityColor(severity: DisasterAlert["severity"], accent: string) {
  return severity === "critical" ? "#FF5964" : severity === "high" ? "#FFB34D" : severity === "moderate" ? "#EACB5B" : accent;
}

function GlassMetricBlock({ label, value, valueColor, colors }: { label: string; value: string; valueColor: string; colors: Colors }) {
  const interaction = useRef(new Animated.Value(0)).current;
  const animateTo = (toValue: number, duration = 150) => {
    Animated.timing(interaction, { toValue, duration, useNativeDriver: true }).start();
  };
  const transform = [{ scale: interaction.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }, { translateY: interaction.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }];

  return <Pressable accessibilityLabel={`${label}: ${value}`} onHoverIn={() => animateTo(1)} onHoverOut={() => animateTo(0)} onFocus={() => animateTo(1)} onBlur={() => animateTo(0)} onPressIn={() => animateTo(0.55, 90)} onPressOut={() => animateTo(0)} style={styles.glassPressable}>
    <Animated.View style={[styles.glassBlock, styles.glassSurface, { borderColor: "rgba(255,255,255,0.16)", backgroundColor: "rgba(255,255,255,0.065)", transform }]}>
      <Text style={[styles.glassLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>{label}</Text>
      <Text style={[label === "SOURCE" ? styles.glassSource : styles.glassValue, { color: valueColor, fontFamily: DISPLAY_FONT }]}>{value}</Text>
    </Animated.View>
  </Pressable>;
}

function SignalField({ activeCount, colors }: { activeCount: number; colors: Colors }) {
  const status = activeCount ? "REVIEW REQUIRED" : "LOCAL WORKSPACE READY";
  return <View style={[redesign.signalField, { borderColor: activeCount ? "rgba(255,107,107,0.7)" : colors.border, backgroundColor: colors.surface }]}>
    <View style={redesign.signalGrid}><View style={[redesign.signalNode, redesign.nodeOne, { borderColor: colors.accent }]} /><View style={[redesign.signalNode, redesign.nodeTwo, { borderColor: colors.accent }]} /><View style={[redesign.signalNode, redesign.nodeThree, { borderColor: colors.accent }]} /><View style={[redesign.signalLine, redesign.lineOne, { backgroundColor: colors.accent }]} /><View style={[redesign.signalLine, redesign.lineTwo, { backgroundColor: colors.accent }]} /></View>
    <View style={redesign.signalTop}><View style={[redesign.signalState, { borderColor: activeCount ? "rgba(255,107,107,0.55)" : "rgba(45,212,191,0.45)" }]}><View style={[redesign.signalDot, { backgroundColor: activeCount ? "#FF6B6B" : colors.accent }]} /><Text style={[redesign.signalStateText, { color: activeCount ? "#FF9D9D" : colors.accent, fontFamily: DISPLAY_FONT }]}>{status}</Text></View><Text style={[redesign.signalTimestamp, { color: colors.muted }]}>LOCAL</Text></View>
    <View style={redesign.signalCopy}><Text style={[redesign.signalTitle, { color: colors.text, fontFamily: DISPLAY_FONT }]}>{activeCount ? `${activeCount.toString().padStart(2, "0")} NOTICE${activeCount === 1 ? "" : "S"}\nNEED REVIEW.` : "STAY READY.\nMOVE CLEAR."}</Text><Text style={[redesign.signalBody, { color: colors.muted }]}>{activeCount ? "Review the local alert queue, then acknowledge records when you have read them." : "Your local alert workspace is ready. Alerts and response records stay accessible when networks fail."}</Text></View>
    <View style={[redesign.signalFooter, { borderTopColor: colors.border }]}><Text style={[redesign.signalFooterLabel, { color: colors.muted }]}>ALERT COMMAND</Text><View style={redesign.signalLegend}><View style={[redesign.legendDot, { backgroundColor: colors.accent }]} /><Text style={[redesign.signalFooterLabel, { color: colors.text }]}>ON-DEVICE STATUS</Text></View></View>
  </View>;
}

export function AlertsCenter({ colors, onNavigate }: { colors: Colors; onNavigate?: (destination: string) => void }) {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const [categories, setCategories] = useState<AlertCategory[]>(["safety", "evacuation"]);
  const [testAlertFeedback, setTestAlertFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const remoteAlerts = trpc.alerts.list.useQuery({ limit: 50 }, { refetchInterval: 60_000 });
  const officialFeed = trpc.alerts.officialFeedStatus.useQuery();
  const knownRemoteAlertVersions = useRef(new Map<string, string>());
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
    const alertVersion = (alert: (typeof incoming)[number]) => [alert.issuedAt, alert.severity, alert.summary, alert.status, alert.resolvedAt ?? ""].join("|");
    if (!remoteInitialized.current) {
      incoming.forEach((alert) => knownRemoteAlertVersions.current.set(alert.id, alertVersion(alert)));
      remoteInitialized.current = true;
      return;
    }
    incoming.forEach((alert) => {
      const version = alertVersion(alert);
      const prior = knownRemoteAlertVersions.current.get(alert.id);
      if (prior === version) return;
      knownRemoteAlertVersions.current.set(alert.id, version);
      if (!categories.includes(alert.type as AlertCategory)) return;
      const resolved = alert.status === "resolved";
      const presentation: DisasterAlert = { id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: resolved ? "resolved" : "active", origin_device_id: alert.originDeviceId, acknowledged_at: null, resolved_at: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null, hazard: alert.hazard, target_label: alert.targetLabel, target_latitude: alert.targetLatitude, target_longitude: alert.targetLongitude, target_radius_m: alert.targetRadiusM, locale: alert.locale };
      const heading = resolved ? "ALERT RESOLVED" : prior ? "ALERT UPDATED" : `${alert.severity.toUpperCase()} ALERT`;
      Alert.alert(heading, `${alert.title}\n\n${alert.summary}`);
      if (!resolved) void notifyLocalAlert(presentation);
    });
  }, [categories, remoteAlerts.data]);

  useEffect(() => {
    const records: DisasterAlert[] = (remoteAlerts.data ?? []).map((alert) => ({ id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: alert.status === "resolved" ? "resolved" : "active", origin_device_id: alert.originDeviceId, acknowledged_at: null, resolved_at: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null, hazard: alert.hazard, target_label: alert.targetLabel, target_latitude: alert.targetLatitude, target_longitude: alert.targetLongitude, target_radius_m: alert.targetRadiusM, locale: alert.locale }));
    if (!records.length) return;
    void mirrorControlledAlerts(records).then(refresh).catch(() => undefined);
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
    try {
      const testPermission = permission === "granted" ? "granted" : await requestLocalAlertPermission();
      setPermission(testPermission);
      const { alert, notified } = await createLocalAlert({
        title: "Local disaster-alert test",
        summary: "This is an on-device test alert. It is not from a government, IoT, weather, or live external provider.",
        type: "test",
        severity: "high",
        source: "local_report",
      });
      setAlerts((current) => [alert, ...current.filter((entry) => entry.id !== alert.id)]);
      const feedback = notified
        ? "Test alert created. Android requested the device alert sound and vibration, and the alert is now in this list."
        : testPermission === "unsupported"
          ? "Test alert created. It is now visible in this list. Browser preview cannot play the Android alert buzzer."
          : "Test alert created. It is now visible in this list, but alert sound needs notification permission in Android settings.";
      setTestAlertFeedback({ kind: "success", text: feedback });
      Alert.alert("Local alert created", feedback);
    } catch (error) {
      setTestAlertFeedback({ kind: "error", text: error instanceof Error ? `Test alert could not be created: ${error.message}` : "Test alert could not be created. Try reloading the app, then try again." });
    }
  };

  const toggleCategory = async (category: AlertCategory) => {
    const next = categories.includes(category) ? categories.filter((value) => value !== category) : [...categories, category];
    const saved = await saveAlertCategories(next);
    setCategories(saved);
  };

  const acknowledge = (alertId: string) => {
    void acknowledgeLocalAlert(alertId).then(refresh).catch((error) => Alert.alert("Acknowledgement unavailable", error instanceof Error ? error.message : "The local alert record could not be acknowledged."));
  };

  const recordCitizenSafetyCheckIn = () => {
    void auditService.logAction("citizen_safety_checkin_recorded", { status: "safe", delivery: "local_only", operator_receipt: false }).then(() => {
      Alert.alert("You are marked safe on this device", "Your safety status is saved locally. It has not been sent to an operator or emergency service because no dashboard connection is configured.");
    }).catch(() => Alert.alert("Safety status could not be saved", "Keep yourself safe and try again. You can still use the safety guide or call 112 if needed."));
  };

  const openSupportLink = (url: string) => {
    setMenuOpen(false);
    void Linking.openURL(url).catch(() => Alert.alert("Link unavailable", "Air-Mesh could not open this support link on this device."));
  };

  const serverAlerts: DisasterAlert[] = (remoteAlerts.data ?? []).map((alert) => ({ id: alert.id, title: alert.title, summary: alert.summary, type: alert.type, severity: alert.severity, source: alert.source, issued_at: new Date(alert.issuedAt).toISOString(), expires_at: alert.expiresAt ? new Date(alert.expiresAt).toISOString() : null, status: alert.status === "resolved" ? "resolved" : "active", origin_device_id: alert.originDeviceId, acknowledged_at: null, resolved_at: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null, hazard: alert.hazard, target_label: alert.targetLabel, target_latitude: alert.targetLatitude, target_longitude: alert.targetLongitude, target_radius_m: alert.targetRadiusM, locale: alert.locale }));
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
        <SignalField activeCount={active.length} colors={colors} />

        <View style={[styles.citizenActionPanel, { backgroundColor: colors.field, borderColor: colors.border }]}>
          <Text style={[styles.micro, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>WHAT DO YOU NEED TO DO?</Text>
          <Text style={[styles.citizenActionTitle, { color: colors.text }]}>One clear action at a time.</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>You can use these safety tools without an email, password, or internet connection.</Text>
          <View style={styles.citizenActionGrid}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open Safety and Evacuation" onPress={() => onNavigate?.("india-response")} style={({ pressed }) => [styles.citizenAction, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="health-and-safety" size={20} color={colors.accent} /><Text style={[styles.citizenActionText, { color: colors.text }]}>Safety & evacuation</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Mark myself safe locally" onPress={recordCitizenSafetyCheckIn} style={({ pressed }) => [styles.citizenAction, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="verified-user" size={20} color={colors.accent} /><Text style={[styles.citizenActionText, { color: colors.text }]}>I’m safe</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open help request tools" onPress={() => onNavigate?.("india-response")} style={({ pressed }) => [styles.citizenAction, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="sos" size={20} color="#FF5964" /><Text style={[styles.citizenActionText, { color: colors.text }]}>Need help</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Report an incident" onPress={() => onNavigate?.("report")} style={({ pressed }) => [styles.citizenAction, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="report" size={20} color={colors.accent} /><Text style={[styles.citizenActionText, { color: colors.text }]}>Report incident</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open offline coordination chat" onPress={() => onNavigate?.("messages")} style={({ pressed }) => [styles.offlineChatHint, { borderTopColor: colors.border, opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="forum" size={17} color={colors.accent} /><Text style={[styles.offlineChatHintText, { color: colors.muted }]}>No internet? Save a report first, then use offline chat or nearby relay.</Text><MaterialIcons name="chevron-right" size={18} color={colors.muted} /></Pressable>
        </View>

        <WebCommandCompanion colors={colors} activeAlerts={active.length} serverAlertCount={serverAlerts.length} controlledServiceAvailable={!remoteAlerts.isError} />

        <View style={[styles.commandLine, styles.glassSurface, { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.065)" }]}><View style={[styles.commandIcon, { backgroundColor: active.length ? severityColor(active[0].severity, colors.accent) : "rgba(255,255,255,0.08)" }]}><MaterialIcons name={active.length ? "notification-important" : "verified-user"} size={18} color={active.length ? "#000" : colors.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.micro, { color: active.length ? severityColor(active[0].severity, colors.accent) : colors.accent, fontFamily: DISPLAY_FONT }]}>{active.length ? `${active.length} ACTION REQUIRED` : "SYSTEM READY"}</Text><Text style={[styles.commandText, { color: colors.text }]}>{active.length ? "Local alerts need a review." : "No local alert needs action."}</Text></View><Text style={[styles.commandTime, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>{remoteAlerts.isFetching ? "SYNCING" : "LOCAL"}</Text></View>
        <View style={styles.glassGrid}>
          <GlassMetricBlock label="ACTIVE" value={active.length.toString().padStart(2, "0")} valueColor={colors.text} colors={colors} />
          <GlassMetricBlock label="CHANNELS" value={categories.length.toString().padStart(2, "0")} valueColor={colors.text} colors={colors} />
          <GlassMetricBlock label="SOURCE" value={officialFeed.data?.state === "ready_for_authorized_polling" ? "OFFICIAL" : "LOCAL"} valueColor={officialFeed.data?.state === "ready_for_authorized_polling" ? colors.accent : "#FFB34D"} colors={colors} />
        </View>

        <Text style={[styles.section, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>ALERT NOTIFICATION TYPES</Text>
        <Text style={[styles.caption, { color: colors.muted }]}>These switches only control which alert types can notify you. Use Safety & evacuation above for precautions and evacuation help.</Text>
        <View style={styles.categoryGrid}>{ALERT_CATEGORIES.map((category) => <Pressable key={category} onPress={() => void toggleCategory(category)} style={({ pressed }) => [styles.category, { borderColor: categories.includes(category) ? colors.accent : colors.border, backgroundColor: categories.includes(category) ? colors.accent : "transparent", opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.categoryText, { color: categories.includes(category) ? (colors.onAccent ?? "#000") : colors.text }]}>{category}</Text></Pressable>)}</View>

        <View style={[styles.status, { backgroundColor: colors.field, borderColor: active.length ? severityColor(active[0].severity, colors.accent) : colors.border }]}> 
          <View style={[styles.statusIcon, { backgroundColor: active.length ? severityColor(active[0].severity, colors.accent) : colors.surface }]}><MaterialIcons name={active.length ? "notification-important" : "notifications-none"} size={22} color={active.length ? "#000" : colors.muted} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.micro, { color: active.length ? severityColor(active[0].severity, colors.accent) : colors.muted }]}>{active.length ? `${active.length} ACTIVE LOCAL ALERT${active.length === 1 ? "" : "S"}` : "NO ACTIVE LOCAL ALERTS"}</Text><Text style={[styles.caption, { color: colors.muted }]}>{active.length ? "Review and acknowledge local records below." : "Create a test alert to validate this device workflow."}</Text></View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => void createTest()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: pressed ? 0.86 : 1 }]}><MaterialIcons name="add-alert" size={17} color={colors.onAccent ?? "#000"} /><Text style={[styles.primaryText, { color: colors.onAccent ?? "#000" }]}>Test alert</Text></Pressable>
          <Pressable onPress={() => void enableNotifications()} style={({ pressed }) => [styles.secondary, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><MaterialIcons name="notifications-active" size={17} color={colors.accent} /><Text style={[styles.secondaryText, { color: colors.text }]}>{permission === "granted" ? "Alerts ready" : "Enable alerts"}</Text></Pressable>
        </View>
        {testAlertFeedback && <View style={[styles.testAlertFeedback, { borderColor: testAlertFeedback.kind === "success" ? colors.accent : "#FF5964", backgroundColor: colors.field }]}><MaterialIcons name={testAlertFeedback.kind === "success" ? "check-circle" : "error-outline"} size={18} color={testAlertFeedback.kind === "success" ? colors.accent : "#FF5964"} /><Text style={[styles.caption, { color: colors.text, flex: 1 }]}>{testAlertFeedback.text}</Text></View>}
        <Text style={[styles.caption, { color: colors.muted, marginTop: 10 }]}>Notification status: {permission === "unknown" ? "not requested this session" : permission}. Permission is requested only when you select Enable alerts.</Text>
        <Text style={[styles.caption, { color: officialFeed.data?.state === "ready_for_authorized_polling" ? colors.muted : "#FFB34D", marginTop: 4 }]}>{officialFeed.isLoading ? "Checking official-feed readiness…" : officialFeed.data?.state === "ready_for_authorized_polling" ? "Official CAP feed is approved for server-side polling. CAP XML validation still applies before an alert can appear." : "Official feed not connected. Local alerts, safety guidance, reporting, and offline chat remain available."}</Text>
        <Text style={[styles.caption, { color: remoteAlerts.isError ? "#FFB34D" : colors.muted, marginTop: 4 }]}>{remoteAlerts.isLoading ? "Checking controlled alert service…" : remoteAlerts.isError ? "Controlled alert service unavailable. Local alerts remain available." : `Controlled alert service connected · ${serverAlerts.length} server alert${serverAlerts.length === 1 ? "" : "s"}`}</Text>

        <AlertsDashboard alerts={mergedAlerts} colors={colors} onAcknowledge={acknowledge} />
      </ScrollView>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={[styles.menuSheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => undefined}>
            <View style={styles.menuSheetTop}><View><Text style={[styles.menuTitle, { color: colors.text, fontFamily: DISPLAY_FONT }]}>AIR-MESH</Text><Text style={[styles.micro, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>COMMAND MENU</Text></View><Pressable accessibilityLabel="Close menu" onPress={() => setMenuOpen(false)} style={styles.closeMenu}><MaterialIcons name="close" size={22} color={colors.muted} /></Pressable></View>
            <Text style={[styles.menuIntro, { color: colors.muted }]}>Local-first alert management and disaster coordination support.</Text>
            <Pressable onPress={() => { setMenuOpen(false); onNavigate?.("authority"); }} style={[styles.menuItem, { borderBottomColor: colors.border }]}><MaterialIcons name="admin-panel-settings" size={20} color={colors.accent} /><View style={{ flex: 1 }}><Text style={[styles.menuItemTitle, { color: colors.text }]}>Authority Console</Text><Text style={[styles.caption, { color: colors.muted }]}>Authorized publishing and controlled-alert monitoring.</Text></View><MaterialIcons name="chevron-right" size={18} color={colors.muted} /></Pressable>
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

const redesign = StyleSheet.create({
  signalField: { minHeight: 310, borderWidth: 1, borderRadius: 24, overflow: "hidden", padding: 18, justifyContent: "space-between" },
  signalGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.74 },
  signalNode: { position: "absolute", width: 12, height: 12, borderWidth: 2, borderRadius: 6, backgroundColor: "#070909" }, nodeOne: { top: 42, right: 36 }, nodeTwo: { top: 155, right: 102 }, nodeThree: { bottom: 42, right: 30 },
  signalLine: { position: "absolute", height: 1, opacity: 0.4 }, lineOne: { width: 114, top: 82, right: 48, transform: [{ rotate: "124deg" }] }, lineTwo: { width: 108, top: 168, right: 45, transform: [{ rotate: "-128deg" }] },
  signalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, signalState: { minHeight: 30, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7 }, signalDot: { width: 7, height: 7, borderRadius: 4 }, signalStateText: { fontSize: 9, letterSpacing: 0.9, fontWeight: "900" }, signalTimestamp: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  signalCopy: { maxWidth: "86%", marginTop: 25 }, signalTitle: { fontSize: 33, lineHeight: 34, letterSpacing: -1.5, fontWeight: "900" }, signalBody: { fontSize: 13, lineHeight: 19, marginTop: 12, maxWidth: 286 },
  signalFooter: { paddingTop: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth }, signalLegend: { flexDirection: "row", alignItems: "center", gap: 6 }, legendDot: { width: 6, height: 6, borderRadius: 3 }, signalFooterLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.85 },
});

const styles = StyleSheet.create({
  header: { height: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  brand: { fontSize: 18, fontWeight: "900", letterSpacing: -0.7 }, micro: { fontSize: 10, fontWeight: "900", letterSpacing: 1.15 }, menuButton: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  content: { padding: 18, paddingBottom: 32 }, hero: { minHeight: 260, borderRadius: 22, overflow: "hidden", borderWidth: 1, marginTop: 2 }, heroImage: { opacity: 0.74, resizeMode: "cover" }, hiddenHeroImage: { opacity: 0 }, heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" }, heroContent: { flex: 1, minHeight: 260, justifyContent: "space-between", padding: 18 }, heroEyebrow: { alignSelf: "flex-start", flexDirection: "row", gap: 7, alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.55)" }, pulse: { width: 7, height: 7, borderRadius: 4 }, heroEyebrowText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, heroTitle: { color: "#FFFFFF", fontSize: 39, lineHeight: 38, fontWeight: "900", letterSpacing: -1.6, marginTop: 16 }, heroCopy: { color: "#D1D7CB", fontSize: 13, lineHeight: 19, maxWidth: "76%", marginTop: 12 }, heroFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  glassSurface: { boxShadow: "0px 7px 14px rgba(0, 0, 0, 0.28)", elevation: 4 }, commandLine: { minHeight: 68, borderRadius: 16, borderWidth: 1, padding: 12, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 }, commandIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, commandText: { fontSize: 13, fontWeight: "800", marginTop: 2 }, commandTime: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  citizenActionPanel: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 14 }, citizenActionTitle: { fontSize: 17, lineHeight: 21, fontWeight: "900", marginTop: 4, marginBottom: 3 }, citizenActionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 }, citizenAction: { width: "48.6%", minHeight: 78, borderWidth: 1, borderRadius: 14, justifyContent: "center", alignItems: "flex-start", paddingHorizontal: 12, gap: 7 }, citizenActionText: { fontSize: 12, fontWeight: "900" }, offlineChatHint: { minHeight: 46, marginTop: 12, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 7 }, offlineChatHintText: { flex: 1, fontSize: 11, lineHeight: 15 }, testAlertFeedback: { minHeight: 48, borderWidth: 1, borderRadius: 13, marginTop: 10, paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  status: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 18, flexDirection: "row", alignItems: "center", gap: 11 }, statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  glassGrid: { flexDirection: "row", gap: 8, marginTop: 10 }, glassPressable: { flex: 1 }, glassBlock: { flex: 1, minHeight: 76, borderWidth: 1, borderRadius: 15, padding: 10, justifyContent: "space-between" }, glassLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.7 }, glassValue: { fontSize: 23, lineHeight: 24, fontWeight: "900", letterSpacing: -0.8 }, glassSource: { fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: -0.2 },
  caption: { fontSize: 12, lineHeight: 17 }, categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }, category: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, categoryText: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" }, actions: { flexDirection: "row", gap: 9, marginTop: 14 }, primary: { flex: 1, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, primaryText: { fontSize: 13, fontWeight: "900" }, secondary: { flex: 1, height: 43, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, secondaryText: { fontSize: 13, fontWeight: "800" },
  section: { fontSize: 10, fontWeight: "900", letterSpacing: 1.25, marginTop: 22, marginBottom: 9 }, empty: { minHeight: 130, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 7, padding: 18 }, emptyTitle: { fontSize: 14, fontWeight: "800" },
  alert: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", gap: 10 }, dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 }, alertTitle: { fontSize: 15, fontWeight: "800", marginTop: 4, marginBottom: 4 }, ack: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginTop: 9 }, ackText: { fontSize: 12, fontWeight: "800" },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-start" }, menuSheet: { marginTop: 62, marginHorizontal: 12, borderRadius: 22, borderWidth: 1, padding: 16 }, menuSheetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, menuTitle: { fontSize: 21, fontWeight: "900", letterSpacing: -0.9 }, closeMenu: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, menuIntro: { fontSize: 13, lineHeight: 18, marginTop: 13, marginBottom: 8 }, menuItem: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 }, menuItemTitle: { fontSize: 14, fontWeight: "900", marginBottom: 2 }, menuRule: { height: StyleSheet.hairlineWidth, marginVertical: 13 },
});
