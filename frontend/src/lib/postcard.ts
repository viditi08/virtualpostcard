import type { CardSize, Orientation } from "@/lib/types";

export type StampCategory = "travel" | "love" | "birthday" | "nature" | "photo";

export interface StampDef {
  id: string;
  name: string;
  category: StampCategory;
  art: string;
  value: string;
  country: string;
  year: string;
  paper: string;
  ink: string;
}

export const STAMP_CATEGORIES: { value: StampCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "travel", label: "Travel" },
  { value: "love", label: "Love" },
  { value: "birthday", label: "Birthday" },
  { value: "nature", label: "Night & Nature" },
  { value: "photo", label: "Your photo" },
];

export const STAMPS: StampDef[] = [
  { id: "vintage_airmail", name: "Par Avion", category: "travel", art: "plane", value: "25¢", country: "AIRMAIL", year: "1952", paper: "#E9F0F6", ink: "#2B4C6F" },
  { id: "hot_air_balloon", name: "Up & Away", category: "travel", art: "balloon", value: "40¢", country: "SKYWARD", year: "1961", paper: "#FBF0DF", ink: "#8B3A22" },
  { id: "lighthouse", name: "Harbour Light", category: "travel", art: "lighthouse", value: "55¢", country: "SEASIDE", year: "1948", paper: "#E4EAF1", ink: "#1E2F44" },
  { id: "heart_seal", name: "With Love", category: "love", art: "envelope_heart", value: "60¢", country: "AMOUR", year: "1970", paper: "#FCEBEC", ink: "#8E2C3B" },
  { id: "rose_bloom", name: "Garden Rose", category: "love", art: "rose", value: "35¢", country: "ROMANCE", year: "1966", paper: "#FDF3EC", ink: "#7A2433" },
  { id: "birthday_cake", name: "Many Happy", category: "birthday", art: "cake", value: "50¢", country: "CELEBRATE", year: "1975", paper: "#F1ECF9", ink: "#4E3A7A" },
  { id: "party_balloons", name: "Hip Hooray", category: "birthday", art: "party_balloons", value: "30¢", country: "PARTY", year: "1979", paper: "#FFF6E4", ink: "#8A5A12" },
  { id: "celestial_moon", name: "Goodnight", category: "nature", art: "moon", value: "45¢", country: "NOCTURNE", year: "1958", paper: "#E7E9F2", ink: "#1F2A44" },
  { id: "botanical_flora", name: "Wild Fern", category: "nature", art: "fern", value: "20¢", country: "BOTANICA", year: "1944", paper: "#EDF3EA", ink: "#2F5640" },
  { id: "whimsical_dove", name: "Songbird", category: "nature", art: "bird", value: "10¢", country: "FIRST CLASS", year: "1950", paper: "#F7F0E4", ink: "#5C4033" },
  { id: "fox_friend", name: "Little Fox", category: "nature", art: "fox", value: "15¢", country: "WOODLAND", year: "1963", paper: "#F0F4EC", ink: "#7A3A16" },
  { id: "photo", name: "My Picture", category: "photo", art: "", value: "$1", country: "PERSONAL", year: "2026", paper: "#F6EFE4", ink: "#2C1810" },
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
