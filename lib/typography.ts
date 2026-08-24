import { Platform } from "react-native";

/**
 * Android receives an explicitly embedded display family during native builds.
 * Other runtimes deliberately use their platform fallback instead of blocking startup
 * on a runtime font-loader request.
 */
export const DISPLAY_FONT = Platform.OS === "android" ? "ArchivoExpanded" : undefined;
export const DISPLAY_TEXT = { fontFamily: DISPLAY_FONT } as const;
