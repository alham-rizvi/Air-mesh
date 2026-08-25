import { router } from "expo-router";

import { PublicProjectSite } from "@/components/public-project-site";
import { useThemeContext } from "@/lib/theme-provider";

const palette = (mode: "dark" | "light") => mode === "dark"
  ? { bg: "#070909", surface: "#101513", text: "#F4F7F3", muted: "#AAB5AF", border: "#25312B", field: "#151C19", accent: "#2DD4BF", onAccent: "#070909" }
  : { bg: "#F3F6F3", surface: "#FFFFFF", text: "#111815", muted: "#607068", border: "#D8E0DB", field: "#E9EFEB", accent: "#0A7A6D", onAccent: "#FFFFFF" };

export default function WebsiteScreen() {
  const { colorScheme } = useThemeContext();
  return <PublicProjectSite colors={palette(colorScheme)} onOpenApp={() => router.replace("/")} />;
}
