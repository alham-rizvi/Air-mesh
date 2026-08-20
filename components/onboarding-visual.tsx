import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';

type OnboardingColors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string };

export function OnboardingVisual({ colors }: { colors: OnboardingColors }) {
  return (
    <View style={[styles.visual, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Image source={require('../assets/images/onboarding-hiker-phone.jpg')} style={styles.image} resizeMode="cover" />
      <View style={styles.scrim} />
      <View style={[styles.caption, { backgroundColor: 'rgba(7, 30, 25, 0.86)' }]}>
        <Text style={[styles.captionEyebrow, { color: '#9FE6D0' }]}>AIR-MESH OFFLINE</Text>
        <Text style={styles.captionTitle}>Prepared before the signal disappears.</Text>
      </View>
    </View>
  );
}

export function HomePreparednessVisual({ colors }: { colors: OnboardingColors }) {
  return (
    <View style={[styles.homeVisual, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Image source={require('../assets/images/onboarding-hiker-phone.jpg')} style={styles.homeImage} resizeMode="cover" />
      <View style={styles.homeScrim} />
      <View style={styles.homeCopy}>
        <Text style={styles.homeEyebrow}>OFFLINE-READY</Text>
        <Text style={styles.homeTitle}>Prepared before the signal disappears.</Text>
        <Text style={styles.homeBody}>Decorative field image · not a live coverage map</Text>
      </View>
    </View>
  );
}

export function BootstrapScreen({ colors }: { colors: OnboardingColors }) {
  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.bootstrap, { backgroundColor: colors.bg }]}>
        <View style={[styles.bootstrapMark, { borderColor: colors.accent }]} />
        <Text style={[styles.bootstrapTitle, { color: colors.text }]}>Air-Mesh</Text>
        <Text style={[styles.bootstrapBody, { color: colors.muted }]}>Preparing your local workspace</Text>
        <ActivityIndicator color={colors.accent} size="small" style={styles.spinner} />
        <View style={styles.pulseRows}>
          <View style={[styles.pulseWide, { backgroundColor: colors.field }]} />
          <View style={[styles.pulseShort, { backgroundColor: colors.field }]} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  visual: { height: 226, borderWidth: 1, borderRadius: 22, overflow: 'hidden', marginBottom: 22 },
  image: { width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4, 16, 13, 0.18)' },
  caption: { position: 'absolute', left: 14, right: 14, bottom: 14, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  captionEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 4 },
  captionTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', lineHeight: 22 },
  homeVisual: { height: 158, borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  homeImage: { width: '100%', height: '100%' },
  homeScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4, 20, 16, 0.34)' },
  homeCopy: { position: 'absolute', left: 15, right: 15, bottom: 14 },
  homeEyebrow: { color: '#9FE6D0', fontSize: 10, fontWeight: '800', letterSpacing: 1.15, marginBottom: 3 },
  homeTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', lineHeight: 22, maxWidth: '82%' },
  homeBody: { color: '#E8F8F2', fontSize: 11, lineHeight: 15, marginTop: 6 },
  bootstrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bootstrapMark: { width: 42, height: 42, borderWidth: 3, transform: [{ rotate: '45deg' }], borderRadius: 7, marginBottom: 28 },
  bootstrapTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  bootstrapBody: { marginTop: 8, fontSize: 15 },
  spinner: { marginTop: 28 },
  pulseRows: { width: '100%', alignItems: 'center', gap: 10, marginTop: 40 },
  pulseWide: { width: '74%', height: 9, borderRadius: 8 },
  pulseShort: { width: '45%', height: 9, borderRadius: 8 },
});
