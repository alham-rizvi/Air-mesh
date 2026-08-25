import { MaterialIcons } from "@/components/ui/vectorless-icon";
import { ScreenContainer } from "@/components/screen-container";
import { useReportStore } from "@/lib/air-mesh-store";
import { auditService } from "@/mobile/src/services/auditService";
import { saveLocalReport } from "@/mobile/src/services/integration-service";
import type { Report as StoredReport } from "@/mobile/src/types/security-data";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type Colors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string; onAccent: string };
type Severity = "Low" | "Medium" | "High";

const NEEDS = ["Medical help", "People trapped", "Flooded road", "Fire", "Food or water", "Safe shelter"];

export function CitizenIncidentForm({ colors, deviceId, onBack, onSaved }: { colors: Colors; deviceId: string; onBack: () => void; onSaved: () => void }) {
  const addReport = useReportStore((state) => state.addReport);
  const [peopleAffected, setPeopleAffected] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [needs, setNeeds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!details.trim() && needs.length === 0) {
      Alert.alert("Add one detail", "Choose what you need help with or describe what you can see before saving the report.");
      return;
    }

    setSaving(true);
    const id = `incident-${Date.now()}`;
    const people = Math.max(0, Number(peopleAffected) || 0);
    const report: StoredReport = {
      id,
      shelter_id: "citizen-incident",
      timestamp: new Date().toISOString(),
      people_count: people,
      needs,
      notes: details.trim(),
      severity: severity.toLowerCase() as StoredReport["severity"],
      status: "active",
      sync_status: "local",
      origin_device_id: deviceId,
    };

    try {
      await saveLocalReport(report);
      await auditService.logAction("citizen_incident_saved", { report_id: id, dashboard_handoff: "not_configured", offline_state: "saved_on_device" });
      addReport({ id, shelter: "Incident report", time: "Just now", people, needs, severity, status: "Local" });
      Alert.alert("Saved on this device", "The website dashboard is not connected yet, so no operator has received this report. You can later use a configured dashboard, or nearby offline relay when a compatible device accepts it.");
      onSaved();
    } catch (error) {
      Alert.alert("Could not save report", error instanceof Error ? error.message : "Keep yourself safe and try again.");
    } finally {
      setSaving(false);
    }
  };

  return <ScreenContainer><View style={[styles.header, { borderBottomColor: colors.border }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.back}><MaterialIcons name="arrow-back" size={22} color={colors.text} /></Pressable><View><Text style={[styles.headerTitle, { color: colors.text }]}>Report an incident</Text><Text style={[styles.headerMeta, { color: colors.accent }]}>SAVED LOCALLY FIRST</Text></View></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={[styles.intro, { backgroundColor: colors.field, borderColor: colors.border }]}><MaterialIcons name="report" size={22} color={colors.accent} /><View style={{ flex: 1 }}><Text style={[styles.introTitle, { color: colors.text }]}>Share only what you can safely confirm.</Text><Text style={[styles.caption, { color: colors.muted }]}>No email or password is needed. Do not put yourself in danger to collect information.</Text></View></View><View style={[styles.handoff, { borderColor: colors.border, backgroundColor: colors.surface }]}><MaterialIcons name="cloud-off" size={19} color="#FFB34D" /><View style={{ flex: 1 }}><Text style={[styles.handoffTitle, { color: colors.text }]}>Website dashboard not connected</Text><Text style={[styles.caption, { color: colors.muted }]}>This report will stay on this device until a website handoff is configured or an eligible nearby relay accepts it.</Text></View></View><Text style={[styles.label, { color: colors.muted }]}>WHAT DO YOU NEED HELP WITH?</Text><View style={styles.chips}>{NEEDS.map((need) => <Pressable key={need} accessibilityRole="button" onPress={() => setNeeds((current) => current.includes(need) ? current.filter((value) => value !== need) : [...current, need])} style={({ pressed }) => [styles.chip, { borderColor: needs.includes(need) ? colors.accent : colors.border, backgroundColor: needs.includes(need) ? colors.accent : "transparent", opacity: pressed ? 0.72 : 1 }]}><Text style={[styles.chipText, { color: needs.includes(need) ? colors.onAccent : colors.text }]}>{need}</Text></Pressable>)}</View><Text style={[styles.label, { color: colors.muted }]}>WHAT HAPPENED?</Text><TextInput value={details} onChangeText={setDetails} multiline placeholder="Example: Water is entering homes near the bridge. Two people may need medical help." placeholderTextColor={colors.muted} style={[styles.notes, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]} textAlignVertical="top" /><Text style={[styles.label, { color: colors.muted }]}>PEOPLE AFFECTED (OPTIONAL)</Text><TextInput value={peopleAffected} onChangeText={setPeopleAffected} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.field, borderColor: colors.border, color: colors.text }]} /><Text style={[styles.label, { color: colors.muted }]}>URGENCY</Text><View style={styles.severityRow}>{(["Low", "Medium", "High"] as const).map((level) => <Pressable key={level} accessibilityRole="button" onPress={() => setSeverity(level)} style={({ pressed }) => [styles.severity, { borderColor: severity === level ? colors.accent : colors.border, backgroundColor: severity === level ? colors.accent : "transparent", opacity: pressed ? 0.72 : 1 }]}><Text style={{ color: severity === level ? colors.onAccent : colors.text, fontWeight: "800", fontSize: 12 }}>{level}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.save, { backgroundColor: colors.accent, opacity: saving || pressed ? 0.72 : 1 }]}><MaterialIcons name="save" size={18} color={colors.onAccent} /><Text style={[styles.saveText, { color: colors.onAccent }]}>{saving ? "Saving report…" : "Save report on this device"}</Text></Pressable><Text style={[styles.footnote, { color: colors.muted }]}>After saving, you can open offline coordination chat. “Saved on this device” does not mean a responder or website dashboard has received the report.</Text></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ header: { minHeight: 62, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, back: { padding: 7 }, headerTitle: { fontSize: 19, fontWeight: "900", letterSpacing: -0.4 }, headerMeta: { fontSize: 9, fontWeight: "900", letterSpacing: 0.9, marginTop: 2 }, content: { padding: 18, paddingBottom: 34 }, intro: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: "row", gap: 10, alignItems: "flex-start" }, introTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900", marginBottom: 3 }, handoff: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 10, flexDirection: "row", gap: 9, alignItems: "flex-start" }, handoffTitle: { fontSize: 13, fontWeight: "900", marginBottom: 3 }, caption: { fontSize: 12, lineHeight: 17 }, label: { fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 19, marginBottom: 9 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, chip: { borderWidth: 1, borderRadius: 12, minHeight: 39, justifyContent: "center", paddingHorizontal: 12 }, chipText: { fontSize: 12, fontWeight: "800" }, notes: { minHeight: 116, borderWidth: 1, borderRadius: 15, padding: 13, fontSize: 14, lineHeight: 20 }, input: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 15 }, severityRow: { flexDirection: "row", gap: 8 }, severity: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" }, save: { minHeight: 52, borderRadius: 15, marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14 }, saveText: { fontSize: 14, fontWeight: "900" }, footnote: { fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: "center" } });
