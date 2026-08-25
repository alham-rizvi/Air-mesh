import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useCallback, useMemo, useState } from "react";

import { MaterialIcons } from "@/components/ui/vectorless-icon";
import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DISPLAY_FONT } from "@/lib/typography";

type Colors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string; onAccent?: string };
type Severity = "critical" | "high" | "moderate" | "low";
type Hazard = "flood" | "cyclone" | "earthquake" | "heatwave" | "landslide" | "wildfire" | "lightning" | "industrial" | "other";
type ControlledAlert = {
  id: string;
  title: string;
  summary: string;
  type: string;
  severity: Severity;
  issuedAt: Date | string;
  status: "active" | "resolved";
  resolvedAt: Date | string | null;
  hazard: string;
  targetLabel: string | null;
  targetLatitude: number | null;
  targetLongitude: number | null;
  targetRadiusM: number | null;
};

const HAZARDS: Hazard[] = ["flood", "cyclone", "earthquake", "heatwave", "landslide", "wildfire", "lightning", "industrial", "other"];
const SEVERITIES: Severity[] = ["critical", "high", "moderate", "low"];
const ALERT_TYPES = ["safety", "evacuation", "weather", "test"];

const makeDraftId = () => `authority-${Date.now()}`;
const when = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString() : "Not recorded";

function DraftField({ label, value, onChangeText, colors, placeholder, multiline = false, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; colors: Colors; placeholder: string; multiline?: boolean; keyboardType?: "default" | "numeric" }) {
  return <View style={styles.fieldWrap}><Text style={[styles.label, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.multiline, { color: colors.text, backgroundColor: colors.field, borderColor: colors.border }]} /></View>;
}

function ChoiceRow<T extends string>({ label, values, value, onChange, colors }: { label: string; values: readonly T[]; value: T; onChange: (value: T) => void; colors: Colors }) {
  return <View style={styles.fieldWrap}><Text style={[styles.label, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>{label}</Text><View style={styles.chips}>{values.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: option === value }} onPress={() => onChange(option)} style={({ pressed }) => [styles.chip, { backgroundColor: option === value ? colors.accent : colors.field, borderColor: option === value ? colors.accent : colors.border, opacity: pressed ? 0.72 : 1 }]}><Text style={[styles.chipText, { color: option === value ? colors.onAccent ?? "#070909" : colors.text }]}>{option}</Text></Pressable>)}</View></View>;
}

export function AuthorityConsole({ colors, onBack }: { colors: Colors; onBack: () => void }) {
  const { user, loading: authLoading, isAuthenticated, refresh: refreshAuth, logout } = useAuth();
  const session = trpc.authority.session.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const authorized = Boolean(session.data?.authorized);
  const alerts = trpc.authority.list.useQuery({ limit: 50 }, { enabled: authorized, refetchInterval: 15_000, retry: 1 });
  const publish = trpc.authority.publish.useMutation();
  const update = trpc.authority.update.useMutation();
  const resolveAlert = trpc.authority.resolve.useMutation();
  const [id, setId] = useState(makeDraftId);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [type, setType] = useState("evacuation");
  const [severity, setSeverity] = useState<Severity>("high");
  const [hazard, setHazard] = useState<Hazard>("other");
  const [targetLabel, setTargetLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusM, setRadiusM] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeAlerts = useMemo(() => (alerts.data ?? []).filter((alert) => alert.status === "active"), [alerts.data]);
  const resolvedAlerts = useMemo(() => (alerts.data ?? []).filter((alert) => alert.status === "resolved"), [alerts.data]);
  const busy = publish.isPending || update.isPending || resolveAlert.isPending;

  const resetDraft = useCallback(() => {
    setId(makeDraftId()); setTitle(""); setSummary(""); setType("evacuation"); setSeverity("high"); setHazard("other"); setTargetLabel(""); setLatitude(""); setLongitude(""); setRadiusM(""); setSelectedId(null); setFeedback(null);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([session.refetch(), alerts.refetch()]);
  }, [alerts, session]);

  const selectAlert = useCallback((alert: ControlledAlert) => {
    setId(alert.id); setTitle(alert.title); setSummary(alert.summary); setType(alert.type); setSeverity(alert.severity); setHazard(HAZARDS.includes(alert.hazard as Hazard) ? alert.hazard as Hazard : "other"); setTargetLabel(alert.targetLabel ?? ""); setLatitude(alert.targetLatitude === null || alert.targetLatitude === undefined ? "" : String(alert.targetLatitude)); setLongitude(alert.targetLongitude === null || alert.targetLongitude === undefined ? "" : String(alert.targetLongitude)); setRadiusM(alert.targetRadiusM === null || alert.targetRadiusM === undefined ? "" : String(alert.targetRadiusM)); setSelectedId(alert.id); setFeedback(`Editing ${alert.id}. Publishing changes will keep this alert active.`);
  }, []);

  const buildPayload = useCallback(() => {
    if (!title.trim() || !summary.trim()) throw new Error("Enter both an alert title and clear safety instructions.");
    const targetValues = [targetLabel.trim(), latitude.trim(), longitude.trim(), radiusM.trim()];
    const wantsTarget = targetValues.some(Boolean);
    let target: { label: string; latitude: number; longitude: number; radiusM: number } | undefined;
    if (wantsTarget) {
      const parsedLatitude = Number(latitude); const parsedLongitude = Number(longitude); const parsedRadius = Number(radiusM);
      if (!targetLabel.trim() || !Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude) || !Number.isInteger(parsedRadius)) throw new Error("A geographic target needs a label, latitude, longitude, and whole-number radius in metres.");
      target = { label: targetLabel.trim(), latitude: parsedLatitude, longitude: parsedLongitude, radiusM: parsedRadius };
    }
    return { id, title: title.trim(), summary: summary.trim(), type, severity, issuedAt: new Date(), originDeviceId: "authority-console", hazard, locale: "en-IN", target };
  }, [hazard, id, latitude, longitude, radiusM, severity, summary, targetLabel, title, type]);

  const saveAlert = async () => {
    try {
      const payload = buildPayload();
      if (selectedId) await update.mutateAsync(payload); else await publish.mutateAsync(payload);
      setFeedback(selectedId ? "Alert updated. Citizen devices will receive the revised active record on their next controlled-service refresh." : "Alert published to the controlled Air-Mesh service. It is not a cell broadcast, SMS, or government-feed alert.");
      await alerts.refetch();
      if (!selectedId) resetDraft();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The controlled alert could not be saved.");
    }
  };

  const resolveSelected = (alert: ControlledAlert) => {
    Alert.alert("Resolve this alert?", "Resolution changes the shared controlled record and suppresses fresh citizen alert notifications for this incident.", [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", style: "destructive", onPress: () => void (async () => {
        try { await resolveAlert.mutateAsync({ id: alert.id }); setFeedback(`Alert ${alert.id} marked resolved. Citizen devices will mirror its resolved status on refresh.`); if (selectedId === alert.id) resetDraft(); await alerts.refetch(); }
        catch (error) { setFeedback(error instanceof Error ? error.message : "The alert could not be resolved."); }
      })() },
    ]);
  };

  if (authLoading || (isAuthenticated && session.isLoading)) return <ScreenContainer><View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={[styles.body, { color: colors.muted }]}>Checking operator authorization…</Text></View></ScreenContainer>;

  if (!isAuthenticated) return <ScreenContainer><View style={styles.top}><Pressable accessibilityLabel="Return to citizen alerts" onPress={onBack} style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="arrow-back" size={21} color={colors.text} /></Pressable><View><Text style={[styles.heading, { color: colors.text, fontFamily: DISPLAY_FONT }]}>AUTHORITY CONSOLE</Text><Text style={[styles.kicker, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>RESTRICTED WORKSPACE</Text></View></View><ScrollView contentContainerStyle={styles.content}><View style={[styles.boundary, { backgroundColor: colors.field, borderColor: colors.border }]}><MaterialIcons name="admin-panel-settings" size={30} color={colors.accent} /><Text style={[styles.boundaryTitle, { color: colors.text, fontFamily: DISPLAY_FONT }]}>Operator sign-in required</Text><Text style={[styles.body, { color: colors.muted }]}>Citizens never need an account to receive safety tools. Publishing, updating, resolving, and monitoring controlled Air-Mesh alerts requires a deployment-authorized operator account.</Text><Pressable onPress={() => void startOAuthLogin()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: pressed ? 0.78 : 1 }]}><Text style={[styles.primaryText, { color: colors.onAccent ?? "#070909" }]}>Sign in as an operator</Text><MaterialIcons name="login" size={18} color={colors.onAccent ?? "#070909"} /></Pressable></View><View style={[styles.notice, { borderColor: colors.border }]}><Text style={[styles.label, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>CONTROL BOUNDARY</Text><Text style={[styles.body, { color: colors.muted }]}>This workspace manages only controlled Air-Mesh server records. It does not operate cell broadcast, SACHET, ERSS, SMS, sirens, or an official government feed.</Text></View></ScrollView></ScreenContainer>;

  if (!authorized) return <ScreenContainer><View style={styles.top}><Pressable accessibilityLabel="Return to citizen alerts" onPress={onBack} style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="arrow-back" size={21} color={colors.text} /></Pressable><View><Text style={[styles.heading, { color: colors.text, fontFamily: DISPLAY_FONT }]}>AUTHORITY CONSOLE</Text><Text style={[styles.kicker, { color: "#FFB34D", fontFamily: DISPLAY_FONT }]}>ACCESS NOT GRANTED</Text></View></View><ScrollView contentContainerStyle={styles.content}><View style={[styles.boundary, { backgroundColor: colors.field, borderColor: "#FFB34D" }]}><MaterialIcons name="lock" size={30} color="#FFB34D" /><Text style={[styles.boundaryTitle, { color: colors.text, fontFamily: DISPLAY_FONT }]}>This account is not an operator</Text><Text style={[styles.body, { color: colors.muted }]}>Signed in as {user?.name ?? user?.email ?? "an account"}. Ask the Air-Mesh deployment owner to authorize the correct operator account. The publisher credential is never stored in this APK.</Text><Pressable onPress={() => void logout().then(() => refreshAuth())} style={({ pressed }) => [styles.secondary, { borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}><Text style={[styles.secondaryText, { color: colors.text }]}>Sign out</Text></Pressable></View></ScrollView></ScreenContainer>;

  return <ScreenContainer><View style={styles.top}><Pressable accessibilityLabel="Return to citizen alerts" onPress={onBack} style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="arrow-back" size={21} color={colors.text} /></Pressable><View style={{ flex: 1 }}><Text style={[styles.heading, { color: colors.text, fontFamily: DISPLAY_FONT }]}>AUTHORITY CONSOLE</Text><Text style={[styles.kicker, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>CONTROLLED SERVICE · {session.data?.displayName?.toUpperCase()}</Text></View><Pressable accessibilityLabel="Refresh authority monitor" onPress={() => void refresh()} style={[styles.back, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="refresh" size={20} color={colors.accent} /></Pressable></View><ScrollView contentContainerStyle={styles.content}>
    <View style={[styles.boundary, { backgroundColor: colors.field, borderColor: colors.accent }]}><View style={styles.row}><MaterialIcons name="verified-user" size={23} color={colors.accent} /><Text style={[styles.label, { color: colors.accent, fontFamily: DISPLAY_FONT }]}>AUTHORIZED CONTROLLED PUBLISHER</Text></View><Text style={[styles.body, { color: colors.muted, marginTop: 7 }]}>Publish only verified operational instructions. This panel creates Air-Mesh controlled-server records; it does not claim official-provider, carrier, or emergency-service delivery.</Text></View>
    <View style={styles.metrics}><View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.text, fontFamily: DISPLAY_FONT }]}>{String(activeAlerts.length).padStart(2, "0")}</Text><Text style={[styles.metricLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>ACTIVE</Text></View><View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.text, fontFamily: DISPLAY_FONT }]}>{String(resolvedAlerts.length).padStart(2, "0")}</Text><Text style={[styles.metricLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>RESOLVED</Text></View><View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: alerts.isFetching ? colors.accent : colors.text, fontFamily: DISPLAY_FONT }]}>{alerts.isFetching ? "SYNC" : "LIVE"}</Text><Text style={[styles.metricLabel, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>MONITOR</Text></View></View>
    <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.formHeading}><View><Text style={[styles.sectionTitle, { color: colors.text, fontFamily: DISPLAY_FONT }]}>{selectedId ? "UPDATE ACTIVE ALERT" : "PUBLISH CONTROLLED ALERT"}</Text><Text style={[styles.body, { color: colors.muted }]}>{selectedId ? `Editing ${selectedId}` : "Complete the safety instruction and optional target before publishing."}</Text></View>{selectedId && <Pressable onPress={resetDraft} style={[styles.clear, { borderColor: colors.border }]}><Text style={[styles.clearText, { color: colors.text }]}>New</Text></Pressable>}</View>
      <DraftField label="ALERT TITLE" value={title} onChangeText={setTitle} colors={colors} placeholder="e.g. Move away from the river" />
      <DraftField label="SAFETY INSTRUCTIONS" value={summary} onChangeText={setSummary} colors={colors} placeholder="Clear, immediate action for affected residents" multiline />
      <ChoiceRow label="SEVERITY" values={SEVERITIES} value={severity} onChange={setSeverity} colors={colors} />
      <ChoiceRow label="HAZARD" values={HAZARDS} value={hazard} onChange={setHazard} colors={colors} />
      <ChoiceRow label="ALERT TYPE" values={ALERT_TYPES} value={type} onChange={setType} colors={colors} />
      <Text style={[styles.label, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>OPTIONAL GEOGRAPHIC TARGET</Text><Text style={[styles.body, { color: colors.muted, marginBottom: 6 }]}>Leave all fields blank for a general controlled alert. Otherwise, all four fields are required.</Text>
      <DraftField label="TARGET LABEL" value={targetLabel} onChangeText={setTargetLabel} colors={colors} placeholder="e.g. Ward 12" />
      <View style={styles.coordinateRow}><View style={{ flex: 1 }}><DraftField label="LATITUDE" value={latitude} onChangeText={setLatitude} colors={colors} placeholder="28.6139" keyboardType="numeric" /></View><View style={{ flex: 1 }}><DraftField label="LONGITUDE" value={longitude} onChangeText={setLongitude} colors={colors} placeholder="77.2090" keyboardType="numeric" /></View></View>
      <DraftField label="RADIUS (METRES)" value={radiusM} onChangeText={setRadiusM} colors={colors} placeholder="1200" keyboardType="numeric" />
      <Pressable disabled={busy} onPress={() => void saveAlert()} style={({ pressed }) => [styles.primary, { backgroundColor: colors.accent, opacity: busy || pressed ? 0.7 : 1 }]}>{busy ? <ActivityIndicator color={colors.onAccent ?? "#070909"} /> : <><Text style={[styles.primaryText, { color: colors.onAccent ?? "#070909" }]}>{selectedId ? "Update controlled alert" : "Publish controlled alert"}</Text><MaterialIcons name={selectedId ? "save" : "campaign"} size={18} color={colors.onAccent ?? "#070909"} /></>}</Pressable>
      {feedback && <View style={[styles.feedback, { backgroundColor: colors.field, borderColor: colors.border }]}><MaterialIcons name="info-outline" size={17} color={colors.accent} /><Text style={[styles.body, { color: colors.text, flex: 1 }]}>{feedback}</Text></View>}
    </View>
    <Text style={[styles.sectionTitle, { color: colors.muted, fontFamily: DISPLAY_FONT }]}>ALERT MONITOR</Text>
    {alerts.isLoading ? <View style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={[styles.body, { color: colors.muted }]}>Loading controlled-server records…</Text></View> : alerts.isError ? <View style={[styles.notice, { borderColor: "#FFB34D" }]}><Text style={[styles.body, { color: "#FFB34D" }]}>Authority monitor is unavailable. No delivery status is being inferred.</Text></View> : (alerts.data ?? []).length === 0 ? <View style={[styles.notice, { borderColor: colors.border }]}><Text style={[styles.body, { color: colors.muted }]}>No controlled-server alerts have been published yet.</Text></View> : (alerts.data ?? []).map((alert) => <View key={alert.id} style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: alert.status === "resolved" ? colors.border : alert.severity === "critical" ? "#FF5964" : colors.accent }]}><View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.label, { color: alert.status === "resolved" ? colors.muted : alert.severity === "critical" ? "#FF5964" : colors.accent, fontFamily: DISPLAY_FONT }]}>{alert.status === "resolved" ? "RESOLVED" : `${alert.severity.toUpperCase()} · ACTIVE`}</Text><Text style={[styles.alertTitle, { color: colors.text }]}>{alert.title}</Text></View><MaterialIcons name={alert.status === "resolved" ? "task-alt" : "notification-important"} size={22} color={alert.status === "resolved" ? colors.muted : colors.accent} /></View><Text style={[styles.body, { color: colors.muted, marginTop: 7 }]}>{alert.summary}</Text><Text style={[styles.meta, { color: colors.muted }]}>{alert.targetLabel ? `${alert.targetLabel}${alert.targetRadiusM ? ` · ${alert.targetRadiusM} m` : ""}` : "No geographic target"} · Issued {when(alert.issuedAt)}</Text>{alert.status === "resolved" ? <Text style={[styles.meta, { color: colors.muted }]}>Resolved {when(alert.resolvedAt)}</Text> : <View style={styles.actionRow}><Pressable onPress={() => selectAlert(alert)} style={[styles.smallAction, { borderColor: colors.border }]}><MaterialIcons name="edit" size={15} color={colors.accent} /><Text style={[styles.smallActionText, { color: colors.text }]}>Update</Text></Pressable><Pressable disabled={busy} onPress={() => resolveSelected(alert)} style={[styles.smallAction, { borderColor: "#FF5964", opacity: busy ? 0.6 : 1 }]}><MaterialIcons name="check-circle" size={15} color="#FF5964" /><Text style={[styles.smallActionText, { color: "#FF5964" }]}>Resolve</Text></Pressable></View>}</View>)}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  top: { minHeight: 68, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 11 }, back: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" }, heading: { fontSize: 17, fontWeight: "900", letterSpacing: -0.5 }, kicker: { fontSize: 9, fontWeight: "900", letterSpacing: 0.95, marginTop: 3 }, content: { padding: 18, paddingBottom: 34 }, boundary: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 8 }, boundaryTitle: { fontSize: 21, lineHeight: 23, fontWeight: "900", letterSpacing: -0.8 }, body: { fontSize: 12, lineHeight: 17 }, notice: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 14 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 26 }, primary: { minHeight: 47, borderRadius: 13, paddingHorizontal: 14, marginTop: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, primaryText: { fontSize: 13, fontWeight: "900" }, secondary: { minHeight: 45, borderRadius: 13, borderWidth: 1, marginTop: 9, alignItems: "center", justifyContent: "center" }, secondaryText: { fontSize: 13, fontWeight: "800" }, metrics: { flexDirection: "row", gap: 8, marginTop: 12 }, metric: { flex: 1, minHeight: 79, borderWidth: 1, borderRadius: 15, padding: 10, justifyContent: "space-between" }, metricValue: { fontSize: 23, fontWeight: "900", letterSpacing: -0.9 }, metricLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.9 }, form: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 13 }, formHeading: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 4 }, sectionTitle: { fontSize: 11, letterSpacing: 0.95, fontWeight: "900", marginTop: 20, marginBottom: 8 }, clear: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, clearText: { fontSize: 11, fontWeight: "800" }, fieldWrap: { marginTop: 12 }, label: { fontSize: 9, fontWeight: "900", letterSpacing: 0.85, marginBottom: 6 }, input: { minHeight: 45, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 }, multiline: { minHeight: 94, textAlignVertical: "top" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { minHeight: 34, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, justifyContent: "center" }, chipText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" }, coordinateRow: { flexDirection: "row", gap: 8 }, feedback: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 10 }, row: { flexDirection: "row", alignItems: "center", gap: 8 }, alertCard: { borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 10 }, alertTitle: { fontSize: 15, fontWeight: "900", marginTop: 3 }, meta: { fontSize: 10, lineHeight: 14, marginTop: 8 }, actionRow: { flexDirection: "row", gap: 8, marginTop: 12 }, smallAction: { minHeight: 35, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 }, smallActionText: { fontSize: 11, fontWeight: "900" },
});
