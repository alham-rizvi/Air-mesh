import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { useDeviceReadiness } from '@/hooks/use-device-readiness';
import { startMeshAdvertising } from '@/mobile/src/services/runtime-transport';

export function AndroidStartupGate({ children }: { children: React.ReactNode }) {
  const device = useDeviceReadiness();
  const [checking, setChecking] = useState(true);
  const [continueLocal, setContinueLocal] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChecking(false), 180);
    return () => clearTimeout(timer);
  }, []);

  const shouldGate = Platform.OS === 'android' && !continueLocal && device.permissionStatus !== 'granted';
  if (!shouldGate) return <>{children}</>;

  if (checking) {
    return <View style={styles.shell}><ActivityIndicator size="large" color="#2ED1A1" /><Text style={styles.loadingTitle}>Checking Android readiness</Text><Text style={styles.body}>Confirming the device boundary before enabling nearby discovery.</Text></View>;
  }

  const supported = device.compatibility.status === 'supported';
  const requestNearby = async () => {
    setRequesting(true);
    const granted = await device.requestPermissions();
    if (granted) await startMeshAdvertising();
    setRequesting(false);
    if (!granted) setContinueLocal(true);
  };

  return <View style={styles.shell}>
    <View style={styles.iconWrap}><MaterialIcons name={supported ? 'bluetooth-searching' : 'phonelink-erase'} size={34} color="#2ED1A1" /></View>
    <Text style={styles.eyebrow}>{supported ? 'ANDROID READY' : 'LOCAL-ONLY MODE'}</Text>
    <Text style={styles.title}>{supported ? 'Enable nearby discovery?' : 'This Android version cannot run the BLE transport.'}</Text>
    <Text style={styles.body}>{device.compatibility.reason}</Text>
    {supported && <View style={styles.explanation}><Text style={styles.explanationTitle}>Why we ask</Text><Text style={styles.explanationBody}>{device.permissionRationale}</Text></View>}
    <Pressable disabled={!supported || requesting} onPress={() => void requestNearby()} style={({ pressed }) => [styles.primary, { opacity: !supported || requesting ? 0.5 : pressed ? 0.82 : 1 }]}>
      <Text style={styles.primaryText}>{requesting ? 'Requesting permission…' : 'Enable nearby discovery'}</Text>
    </Pressable>
    <Pressable onPress={() => setContinueLocal(true)} style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.secondaryText}>Continue with local-only mode</Text>
    </Pressable>
    <Text style={styles.footnote}>You can change this later in Settings. Air-Mesh does not need internet access to store local messages, reports, or identity.</Text>
  </View>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#071612', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  iconWrap: { width: 74, height: 74, borderRadius: 22, backgroundColor: '#10342A', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  eyebrow: { color: '#76DFC0', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 33, textAlign: 'center' },
  loadingTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 18 },
  body: { color: '#B7CDC7', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12 },
  explanation: { width: '100%', marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: '#10261F', borderWidth: 1, borderColor: '#214B3E' },
  explanationTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  explanationBody: { color: '#B7CDC7', fontSize: 13, lineHeight: 19, marginTop: 5 },
  primary: { width: '100%', minHeight: 52, borderRadius: 16, backgroundColor: '#19AA82', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryText: { color: '#B7CDC7', fontSize: 14, fontWeight: '700' },
  footnote: { color: '#809A92', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 },
});
