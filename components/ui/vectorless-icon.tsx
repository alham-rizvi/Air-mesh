import type { ComponentProps } from "react";
import type { ColorValue, StyleProp, TextStyle, ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

type GlyphProps = {
  name: string | number;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle | TextStyle>;
  accessibilityLabel?: string;
};

const common = { fill: "none", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function GlyphShape({ name, color }: Pick<GlyphProps, "name" | "color">) {
  const stroke = color ?? "currentColor";
  switch (String(name)) {
    case "menu": return <><Line {...common} stroke={stroke} x1="4" y1="6" x2="20" y2="6" /><Line {...common} stroke={stroke} x1="4" y1="12" x2="20" y2="12" /><Line {...common} stroke={stroke} x1="4" y1="18" x2="20" y2="18" /></>;
    case "close": return <><Line {...common} stroke={stroke} x1="6" y1="6" x2="18" y2="18" /><Line {...common} stroke={stroke} x1="18" y1="6" x2="6" y2="18" /></>;
    case "arrow-back": return <><Line {...common} stroke={stroke} x1="20" y1="12" x2="5" y2="12" /><Polyline {...common} stroke={stroke} points="11,6 5,12 11,18" /></>;
    case "chevron-right": case "expand-more": return <Polyline {...common} stroke={stroke} points="8,9 12,13 16,9" transform={String(name) === "chevron-right" ? "rotate(-90 12 12)" : undefined} />;
    case "expand-less": return <Polyline {...common} stroke={stroke} points="8,15 12,11 16,15" />;
    case "search": return <><Circle {...common} stroke={stroke} cx="10.5" cy="10.5" r="5.5" /><Line {...common} stroke={stroke} x1="15" y1="15" x2="20" y2="20" /></>;
    case "send": return <Path {...common} stroke={stroke} d="M4 4.8 20.2 12 4 19.2l3-6.1L4 4.8Zm3 8.3h7.1" />;
    case "attach-file": return <Path {...common} stroke={stroke} d="M8.3 12.9 14.8 6.4a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a4.4 4.4 0 0 1-6.2-6.2l7-7" />;
    case "notification-important": case "notifications-active": case "add-alert": return <><Path {...common} stroke={stroke} d="M6.2 17.2h11.6l-1.4-2.3v-4.2a4.4 4.4 0 0 0-8.8 0v4.2l-1.4 2.3Z" /><Path {...common} stroke={stroke} d="M9.7 19.1a2.6 2.6 0 0 0 4.6 0" /><Line {...common} stroke={stroke} x1="12" y1="7.6" x2="12" y2="11.7" /></>;
    case "check-circle": case "done": case "verified-user": return <><Circle {...common} stroke={stroke} cx="12" cy="12" r="8" /><Polyline {...common} stroke={stroke} points="8.3,12.1 10.8,14.5 15.9,9.4" /></>;
    case "radio-button-unchecked": return <Circle {...common} stroke={stroke} cx="12" cy="12" r="7.2" />;
    case "history": case "refresh": return <><Path {...common} stroke={stroke} d="M6.2 9.2A6.7 6.7 0 1 1 5.4 14" /><Polyline {...common} stroke={stroke} points="5.2,5.9 5.2,10.2 9.5,10.2" /></>;
    case "hub": case "account-tree": return <><Circle fill={stroke} cx="12" cy="12" r="2.6" /><Circle {...common} stroke={stroke} cx="5.2" cy="6" r="2" /><Circle {...common} stroke={stroke} cx="18.8" cy="6" r="2" /><Circle {...common} stroke={stroke} cx="5.2" cy="18" r="2" /><Circle {...common} stroke={stroke} cx="18.8" cy="18" r="2" /><Line {...common} stroke={stroke} x1="10" y1="10" x2="6.8" y2="7.7" /><Line {...common} stroke={stroke} x1="14" y1="10" x2="17.2" y2="7.7" /><Line {...common} stroke={stroke} x1="10" y1="14" x2="6.8" y2="16.3" /><Line {...common} stroke={stroke} x1="14" y1="14" x2="17.2" y2="16.3" /></>;
    case "wifi-tethering": case "settings-input-antenna": case "wifi-find": case "bluetooth-searching": return <><Circle fill={stroke} cx="12" cy="12" r="1.8" /><Path {...common} stroke={stroke} d="M8.1 8.1a5.5 5.5 0 0 0 0 7.8M15.9 8.1a5.5 5.5 0 0 1 0 7.8M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" /></>;
    case "warning-amber": return <><Path {...common} stroke={stroke} d="M12 4.2 20 19H4l8-14.8Z" /><Line {...common} stroke={stroke} x1="12" y1="9" x2="12" y2="13.3" /><Circle fill={stroke} cx="12" cy="16.2" r="1" /></>;
    case "visibility": return <><Path {...common} stroke={stroke} d="M3.8 12s3-5.1 8.2-5.1 8.2 5.1 8.2 5.1-3 5.1-8.2 5.1S3.8 12 3.8 12Z" /><Circle {...common} stroke={stroke} cx="12" cy="12" r="2.5" /></>;
    case "map": return <><Path {...common} stroke={stroke} d="m4.5 6.1 5-2.1 5 2.1 5-2.1v13.9l-5 2.1-5-2.1-5 2.1V6.1Z" /><Line {...common} stroke={stroke} x1="9.5" y1="4" x2="9.5" y2="17.9" /><Line {...common} stroke={stroke} x1="14.5" y1="6.1" x2="14.5" y2="20" /></>;
    case "https": case "shield": return <><Path {...common} stroke={stroke} d="M12 3.8 19 6.4v5.1c0 4.3-2.8 7.6-7 8.8-4.2-1.2-7-4.5-7-8.8V6.4l7-2.6Z" /><Rect {...common} stroke={stroke} x="8.7" y="10.7" width="6.6" height="5.3" rx="1" /><Path {...common} stroke={stroke} d="M10.3 10.7V9.5a1.7 1.7 0 0 1 3.4 0v1.2" /></>;
    case "cloud-sync": case "cloud-done": case "cloud-off": return <><Path {...common} stroke={stroke} d="M6.8 17.3h10.1a3.4 3.4 0 0 0 .2-6.8 5.5 5.5 0 0 0-10.6 1.6 2.7 2.7 0 0 0 .3 5.2Z" /><Polyline {...common} stroke={stroke} points="9.1,14.1 11.1,16.1 15.4,11.8" /></>;
    case "cell-tower": case "phone-android": return <><Rect {...common} stroke={stroke} x="7.2" y="3.5" width="9.6" height="17" rx="1.6" /><Line {...common} stroke={stroke} x1="10.2" y1="17.6" x2="13.8" y2="17.6" /><Path {...common} stroke={stroke} d="M4.6 7.7a8.2 8.2 0 0 1 0 8.6M19.4 7.7a8.2 8.2 0 0 0 0 8.6" /></>;
    case "fingerprint": return <><Path {...common} stroke={stroke} d="M8.3 10.2a4.3 4.3 0 0 1 7.4 3M6.3 8.5a6.7 6.7 0 0 1 11.4 4.8M10.3 14.3v1.5a3.1 3.1 0 0 1-1.6 2.7M13.7 13.2v2.1a5 5 0 0 1-2.2 4.1M6.2 13.1v.7a5.8 5.8 0 0 0 1.2 3.6" /></>;
    case "tune": return <><Line {...common} stroke={stroke} x1="5" y1="7" x2="19" y2="7" /><Circle fill={stroke} cx="9" cy="7" r="1.8" /><Line {...common} stroke={stroke} x1="5" y1="12" x2="19" y2="12" /><Circle fill={stroke} cx="15" cy="12" r="1.8" /><Line {...common} stroke={stroke} x1="5" y1="17" x2="19" y2="17" /><Circle fill={stroke} cx="11" cy="17" r="1.8" /></>;
    case "link": case "merge": return <><Path {...common} stroke={stroke} d="M9.2 14.8 7.5 16.5a3 3 0 1 1-4.2-4.2L7 8.6a3 3 0 0 1 4.2 0" /><Path {...common} stroke={stroke} d="m14.8 9.2 1.7-1.7a3 3 0 1 1 4.2 4.2L17 15.4a3 3 0 0 1-4.2 0" /><Line {...common} stroke={stroke} x1="8.7" y1="15.3" x2="15.3" y2="8.7" /></>;
    case "north-east": return <><Line {...common} stroke={stroke} x1="6" y1="18" x2="18" y2="6" /><Polyline {...common} stroke={stroke} points="10,6 18,6 18,14" /></>;
    case "support-agent": return <><Circle {...common} stroke={stroke} cx="12" cy="11" r="3" /><Path {...common} stroke={stroke} d="M5.5 12.5a6.5 6.5 0 0 1 13 0v3.4a2.1 2.1 0 0 1-2.1 2.1H15" /><Path {...common} stroke={stroke} d="M5.5 13.1H4.2v3.2h1.3M18.5 13.1h1.3v3.2h-1.3" /></>;
    case "sos": return <><Circle {...common} stroke={stroke} cx="12" cy="12" r="8" /><Path {...common} stroke={stroke} d="M9.2 13.8h5.6M10.1 10.2h3.8" /></>;
    default: return <><Circle {...common} stroke={stroke} cx="12" cy="12" r="8" /><Circle fill={stroke} cx="12" cy="12" r="1.7" /></>;
  }
}

export function MaterialIcons({ name, size = 24, color, style, accessibilityLabel }: GlyphProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" style={style as StyleProp<ViewStyle>} accessibilityLabel={accessibilityLabel} role="img"><GlyphShape name={name} color={color} /></Svg>;
}

MaterialIcons.glyphMap = {} as Record<string, number>;

export type MaterialIconName = string;
export type MaterialIconProps = ComponentProps<typeof MaterialIcons>;
