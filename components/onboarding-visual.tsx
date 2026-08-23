import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/screen-container';
import { ACCENT_COLORS, useThemeStore, type AccentColor } from '@/lib/air-mesh-store';

type OnboardingColors = { bg: string; surface: string; text: string; muted: string; border: string; field: string; accent: string };

function MeshMark({ size = 38 }: { size?: number }) {
  return <Image source={require('../assets/images/airmesh-teal-logo.png')} style={{ width:size, height:size }} resizeMode="contain" accessibilityLabel="Air-Mesh logo" />;
}

export function OnboardingVisual({ colors }: { colors: OnboardingColors }) {
  return <View style={[styles.launchVisual,{borderColor:colors.border}]}><View style={styles.brandRow}><MeshMark size={34}/><Text style={styles.wordmark}>Air-Mesh</Text></View><View style={styles.launchCopy}><Text style={[styles.eyebrow,{color:'#FFFFFF'}]}>DISASTER ALERT / OFFLINE COORDINATION</Text><Text style={styles.launchTitle}>When the internet fails,{`\n`}Air-Mesh keeps you connected.</Text><Text style={styles.launchBody}>Local alerts, reports, and routes stay on-device. Nearby delivery needs compatible devices and an available peer or route.</Text></View><View style={styles.launchStatus}><View style={[styles.statusDot,{backgroundColor:'#00E5C8'}]}/><Text style={styles.launchStatusText}>LOCAL DISASTER WORKSPACE</Text></View></View>;
}

export function HomePreparednessVisual({ colors }: { colors: OnboardingColors }) {
  return <View style={[styles.homeVisual,{borderColor:colors.border}]}><View style={styles.homeTop}><MeshMark size={28}/><Text style={styles.homeIndex}>DISASTER COORDINATION</Text></View><View style={styles.homeCopy}><Text style={styles.homeTitle}>Local devices. Real routes. Clear status.</Text><Text style={styles.homeBody}>Alerts and messages stay on-device until a supported nearby route is present.</Text></View></View>;
}

function AccentPalette({ colors }: { colors: OnboardingColors }) {
  const accent = useThemeStore((state)=>state.accent);
  const setAccent = useThemeStore((state)=>state.setAccent);
  return <View style={[styles.accentPanel,{borderColor:colors.border,backgroundColor:colors.field}]}><Text style={[styles.eyebrow,{color:colors.text}]}>ACCENT COLOUR</Text><Text style={[styles.accentCopy,{color:colors.muted}]}>Choose from 20 local interface accents. The teal Air-Mesh logo stays independent of your interface choice.</Text><View style={styles.accentGrid}>{ACCENT_COLORS.map((color:AccentColor)=><Pressable key={color} accessibilityLabel={`Use ${color} accent`} onPress={()=>setAccent(color)} style={({pressed,hovered})=>[styles.accentChoice,{backgroundColor:color,borderColor:accent===color?'#FFFFFF':colors.field,borderWidth:accent===color?2:1,opacity:pressed?.7:hovered?.86:1}]}>{accent===color&&<View style={styles.accentSelection}/>}</Pressable>)}</View></View>;
}

export function SettingsProfileVisual({ colors, variant }: { colors: OnboardingColors; variant: 'settings' | 'profile' }) {
  const profile = variant === 'profile';
  return <><View style={[styles.utilityPanel,{backgroundColor:colors.surface,borderColor:colors.border}]}><View style={[styles.utilityGlyph,{borderColor:colors.accent}]}><MaterialIcons name={profile?'fingerprint':'tune'} size={22} color={colors.accent}/></View><View style={{flex:1}}><Text style={[styles.eyebrow,{color:colors.accent}]}>{profile?'LOCAL IDENTITY':'SYSTEM CONTROLS'}</Text><Text style={[styles.utilityTitle,{color:colors.text}]}>{profile?'Identity stays on your device.':'Control the mesh, not the story.'}</Text><Text style={[styles.utilityBody,{color:colors.muted}]}>{profile?'No cloud profile or portrait is required.':'Every switch reflects a local transport or queue setting.'}</Text></View></View>{!profile&&<AccentPalette colors={colors}/>}</>;
}

export function BootstrapScreen({ colors }: { colors: OnboardingColors }) {
  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']}><View style={[styles.bootstrap,{backgroundColor:'#000000'}]}><MeshMark size={66}/><Text style={styles.bootstrapTitle}>airmesh</Text><Text style={[styles.bootstrapBody,{color:colors.muted}]}>Opening disaster coordination workspace</Text><View style={[styles.scanline,{backgroundColor:colors.border}]}><View style={[styles.scanPulse,{backgroundColor:'#00E5C8'}]}/></View></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  launchVisual:{height:390,marginBottom:25,overflow:'hidden',borderBottomWidth:1,backgroundColor:'#000000'}, brandRow:{position:'absolute',top:20,left:20,flexDirection:'row',alignItems:'center',gap:8}, wordmark:{color:'#FFFFFF',fontSize:17,fontWeight:'900',letterSpacing:-.6}, launchCopy:{position:'absolute',left:20,right:28,bottom:64}, eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.4,marginBottom:8}, launchTitle:{color:'#FFFFFF',fontSize:34,lineHeight:35,fontWeight:'900',letterSpacing:-1.65}, launchBody:{color:'rgba(255,255,255,.7)',fontSize:13,lineHeight:19,marginTop:12,maxWidth:310}, launchStatus:{position:'absolute',left:20,bottom:20,flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:'#353535',borderRadius:20,paddingHorizontal:10,paddingVertical:7,backgroundColor:'#000000'}, statusDot:{width:6,height:6,borderRadius:3,backgroundColor:'#FFFFFF'}, launchStatusText:{color:'#FFFFFF',fontSize:9,fontWeight:'800',letterSpacing:.9}, homeVisual:{height:204,marginBottom:17,overflow:'hidden',borderRadius:22,borderWidth:1,backgroundColor:'#000000'}, homeTop:{position:'absolute',top:17,left:16,right:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, homeIndex:{color:'rgba(255,255,255,.65)',fontSize:10,fontWeight:'800',letterSpacing:1}, homeCopy:{position:'absolute',left:17,right:22,bottom:17}, homeTitle:{color:'#FFFFFF',fontSize:22,lineHeight:24,fontWeight:'900',letterSpacing:-.8,maxWidth:248}, homeBody:{color:'rgba(255,255,255,.68)',fontSize:11,lineHeight:16,marginTop:6,maxWidth:260}, utilityPanel:{minHeight:126,borderWidth:1,borderRadius:18,padding:16,marginBottom:16,flexDirection:'row',gap:13}, utilityGlyph:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:'center',justifyContent:'center'}, utilityTitle:{fontSize:16,lineHeight:20,fontWeight:'800'}, utilityBody:{fontSize:11,lineHeight:16,marginTop:5}, accentPanel:{borderWidth:1,borderRadius:18,padding:16,marginBottom:16}, accentCopy:{fontSize:11,lineHeight:16,maxWidth:300}, accentGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:14}, accentChoice:{width:31,height:31,borderRadius:16,alignItems:'center',justifyContent:'center'}, accentSelection:{width:9,height:9,borderRadius:5,backgroundColor:'#000000'}, bootstrap:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:32}, bootstrapTitle:{color:'#FFFFFF',fontSize:31,fontWeight:'900',letterSpacing:-1.3,marginTop:17}, bootstrapBody:{marginTop:8,fontSize:14}, scanline:{width:'72%',height:3,borderRadius:2,marginTop:28,overflow:'hidden'}, scanPulse:{width:'32%',height:'100%',borderRadius:2,backgroundColor:'#FFFFFF'},
});
