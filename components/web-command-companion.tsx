import { MaterialIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { INDIA_PROVIDER_ADAPTERS } from '@/shared/india-response';

type Colors = { surface: string; text: string; muted: string; border: string; field: string; accent: string };

export function WebCommandCompanion({ colors, activeAlerts, serverAlertCount, controlledServiceAvailable }: { colors: Colors; activeAlerts: number; serverAlertCount: number; controlledServiceAvailable: boolean }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 860) return null;
  const unconfigured = INDIA_PROVIDER_ADAPTERS.filter((adapter) => adapter.status === 'not_configured').length;
  return <View style={[styles.shell, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <View style={styles.header}><View><Text style={[styles.kicker, { color: colors.accent }]}>BROWSER COMMAND COMPANION</Text><Text style={[styles.title, { color: colors.text }]}>Air-Mesh response desk</Text></View><View style={[styles.livePill, { borderColor: controlledServiceAvailable ? colors.accent : '#FFB34D' }]}><View style={[styles.dot, { backgroundColor: controlledServiceAvailable ? colors.accent : '#FFB34D' }]} /><Text style={[styles.liveText, { color: controlledServiceAvailable ? colors.accent : '#FFB34D' }]}>{controlledServiceAvailable ? 'CONTROLLED SERVICE REACHABLE' : 'LOCAL-ONLY FALLBACK'}</Text></View></View>
    <View style={styles.grid}>
      <Metric icon="notification-important" label="Active review" value={String(activeAlerts).padStart(2, '0')} detail="Durable alert records awaiting acknowledgement" colors={colors} />
      <Metric icon="cloud-sync" label="Controlled feed" value={String(serverAlertCount).padStart(2, '0')} detail="Server records visible to this browser session" colors={colors} />
      <Metric icon="cell-tower" label="External channels" value="00" detail={`${unconfigured} provider adapters intentionally unconfigured`} colors={colors} />
    </View>
    <View style={[styles.protocolRow, { borderTopColor: colors.border }]}><View style={styles.protocolItem}><MaterialIcons name="https" size={18} color={colors.accent} /><View><Text style={[styles.protocolTitle, { color: colors.text }]}>Production boundary</Text><Text style={[styles.protocolText, { color: colors.muted }]}>Browser and mobile clients use HTTPS; future provider adapters remain server-side.</Text></View></View><View style={styles.protocolItem}><MaterialIcons name="map" size={18} color={colors.accent} /><View><Text style={[styles.protocolTitle, { color: colors.text }]}>India readiness</Text><Text style={[styles.protocolText, { color: colors.muted }]}>112 is user-initiated only. CAP, cell broadcast, maps, and sensors need authorization.</Text></View></View></View>
  </View>;
}

function Metric({ icon, label, value, detail, colors }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; detail: string; colors: Colors }) { return <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.field }]}><MaterialIcons name={icon} size={20} color={colors.accent} /><Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricDetail, { color: colors.muted }]}>{detail}</Text></View>; }

const styles = StyleSheet.create({ shell: { borderWidth: 1, borderRadius: 20, padding: 18, marginTop: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }, kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 }, livePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', gap: 6, alignItems: 'center' }, dot: { height: 7, width: 7, borderRadius: 4 }, liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.65 }, grid: { flexDirection: 'row', gap: 10, marginTop: 16 }, metric: { flex: 1, minHeight: 150, padding: 14, borderRadius: 15, borderWidth: 1 }, metricLabel: { marginTop: 10, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }, metricValue: { fontSize: 30, fontWeight: '900', letterSpacing: -1, marginTop: 5 }, metricDetail: { fontSize: 11, lineHeight: 15, marginTop: 'auto' }, protocolRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14, flexDirection: 'row', gap: 20 }, protocolItem: { flex: 1, flexDirection: 'row', gap: 9 }, protocolTitle: { fontSize: 12, fontWeight: '800' }, protocolText: { fontSize: 11, lineHeight: 15, marginTop: 2 } });
