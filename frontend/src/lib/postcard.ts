import { Feather, Flower2, Heart, MoonStar, Plane, type LucideIcon } from "lucide-react";
import type { CardSize, Orientation } from "@/lib/types";

export interface StampDef {
  id: string;
  name: string;
  gradient: string;
  icon: LucideIcon;
  value: string;
  subtext: string;
}

export const STAMPS: StampDef[] = [
  { id: "vintage_airmail", name: "Classic Airmail", gradient: "from-sky-700 to-indigo-900", icon: Plane, value: "25¢", subtext: "PAR AVION" },
  { id: "botanical_flora", name: "Wild Botanica", gradient: "from-emerald-700 to-teal-900", icon: Flower2, value: "45¢", subtext: "FLORA" },
  { id: "celestial_moon", name: "Midnight Luna", gradient: "from-amber-600 to-rose-900", icon: MoonStar, value: "50¢", subtext: "NIGHT POST" },
  { id: "whimsical_dove", name: "Peace Carrier", gradient: "from-stone-600 to-stone-900", icon: Feather, value: "10¢", subtext: "FIRST CLASS" },
  { id: "heart_seal", name: "Love Letter", gradient: "from-rose-600 to-pink-800", icon: Heart, value: "60¢", subtext: "WITH LOVE" },
];

export const stampById = (id: string) => STAMPS.find((s) => s.id === id) ?? STAMPS[0];

export const SEAL_COLORS = [
  { value: "#B83A28", name: "Crimson" },
  { value: "#2B4C6F", name: "Postal navy" },
  { value: "#3D6B52", name: "Sage" },
  { value: "#C8963E", name: "Gold" },
  { value: "#6B3A6E", name: "Plum" },
];

export const SIZES: { value: CardSize; label: string; inches: string }[] = [
  { value: "standard", label: "Standard", inches: '6 × 4"' },
  { value: "large", label: "Large", inches: '7 × 5"' },
  { value: "square", label: "Square", inches: '5 × 5"' },
];

/** CSS aspect-ratio (width / height) for a size + orientation. Square ignores orientation. */
export function cardRatio(size: CardSize, orientation: Orientation): number {
  if (size === "square") return 1;
  const r = size === "large" ? 7 / 5 : 6 / 4;
  return orientation === "landscape" ? r : 1 / r;
}

export function formatCardDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export const shareUrl = (shareId: string) => `${window.location.origin}/p/${shareId}`;

export const HERO_IMAGE =
  "https://static.prod-images.emergentagent.com/jobs/9e227aa6-9eba-4a34-8d31-e08b4140123f/images/43444362d659995b8ca4e9a9bd9cf46e6633165034d2aa5b4680141efe072e10.jpeg";
