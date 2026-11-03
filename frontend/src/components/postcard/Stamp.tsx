import { useId } from "react";
import { stampById } from "@/lib/postcard";
import { STAMP_ART } from "@/components/postcard/stampArt";
import { cn } from "@/lib/utils";

interface StampProps {
  stampId: string;
  /** Image used by the "photo" stamp (usually the card's front). */
  photoUrl?: string;
  className?: string;
  /** Interactive tilt + foil sweep on hover (used in pickers). */
  interactive?: boolean;
}

/** Perforated, engraved philatelic stamp with illustrated art. Sized by width; 4:5 ratio. */
export function Stamp({ stampId, photoUrl, className, interactive }: StampProps) {
  const s = stampById(stampId);
  const uid = useId().replace(/:/g, "");
  const isPhoto = s.id === "photo";

  return (
    <div
      className={cn(
        "group/stamp drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)]",
        interactive && "transition-transform duration-300 ease-out hover:-translate-y-1 hover:rotate-[-4deg] hover:scale-105",
        className,
      )}
    >
      <div className="stamp-perf relative aspect-[4/5] w-full overflow-hidden bg-[#FDFBF7]">
        <svg viewBox="0 0 100 125" className="block h-full w-full" aria-label={`${s.name} stamp`} role="img">
          <defs>
            <clipPath id={`clip-${uid}`}>
              <rect x="13" y="23" width="74" height="72" rx="1.5" />
            </clipPath>
            <filter id={`tint-${uid}`}>
              <feColorMatrix type="matrix" values="0.55 0.45 0.15 0 0.04  0.35 0.55 0.15 0 0.02  0.25 0.35 0.35 0 0  0 0 0 1 0" />
            </filter>
            <pattern id={`guilloche-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke={s.ink} strokeWidth=".35" opacity=".22" />
            </pattern>
          </defs>
          <rect x="6" y="6" width="88" height="113" fill={s.paper} />
          <rect x="6" y="6" width="88" height="113" fill={`url(#guilloche-${uid})`} />
          <rect x="9" y="9" width="82" height="107" fill="none" stroke={s.ink} strokeWidth="0.9" />
          <rect x="11" y="11" width="78" height="103" fill="none" stroke={s.ink} strokeWidth="0.35" strokeDasharray="1 1" />

          <text x="14" y="19.5" fontFamily="IBM Plex Mono, monospace" fontWeight="600" fontSize="9.5" fill={s.ink}>{s.value}</text>
          <text x="86" y="18.5" textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="4.6" letterSpacing=".6" fill={s.ink}>{s.country}</text>

          <g clipPath={`url(#clip-${uid})`}>
            {isPhoto ? (
              photoUrl ? (
                <image href={photoUrl} x="13" y="23" width="74" height="72" preserveAspectRatio="xMidYMid slice" filter={`url(#tint-${uid})`} />
              ) : (
                <g>
                  <rect x="13" y="23" width="74" height="72" fill="#E2D5C3" />
                  <text x="50" y="62" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="5" fill="#6E5E57">YOUR PHOTO</text>
                </g>
              )
            ) : (
              <svg x="13" y="23" width="74" height="72" viewBox="0 0 80 80" preserveAspectRatio="xMidYMid slice">
                {STAMP_ART[s.art]}
              </svg>
            )}
          </g>
          <rect x="13" y="23" width="74" height="72" rx="1.5" fill="none" stroke={s.ink} strokeWidth="0.8" />

          <text x="50" y="104.5" textAnchor="middle" fontFamily="Lora Variable, Georgia, serif" fontStyle="italic" fontSize="7.4" fill={s.ink}>{s.name}</text>
          <text x="50" y="111" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="3.3" letterSpacing="1.1" fill={s.ink} opacity=".75">
            ★ WHIMSY POST · {s.year} ★
          </text>
        </svg>
        {/* holographic foil sweep */}
        <span aria-hidden className={cn("stamp-foil pointer-events-none absolute inset-0", interactive && "stamp-foil-hover")} />
      </div>
    </div>
  );
}

/** Circular ink cancellation mark. */
export function Postmark({ date, className }: { date: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={cn("pointer-events-none text-postal/70", className)} aria-hidden>
      <circle cx="45" cy="45" r="36" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="45" cy="45" r="28" fill="none" stroke="currentColor" strokeWidth="1" />
      <text x="45" y="41" textAnchor="middle" fill="currentColor" fontSize="9" fontFamily="IBM Plex Mono, monospace">WHIMSY</text>
      <text x="45" y="54" textAnchor="middle" fill="currentColor" fontSize="8" fontFamily="IBM Plex Mono, monospace">{date}</text>
      {[30, 42, 54, 66].map((y) => (
        <path key={y} d={`M88 ${y} q9 -6 18 0 t18 0 t18 0 t18 0`} fill="none" stroke="currentColor" strokeWidth="2.2" />
      ))}
    </svg>
  );
}
