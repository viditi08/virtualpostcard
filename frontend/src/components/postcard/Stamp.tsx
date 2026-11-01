import { stampById } from "@/lib/postcard";
import { cn } from "@/lib/utils";

/** Perforated philatelic stamp. Sized by the parent (width), keeps a 4:5 ratio. */
export function Stamp({ stampId, className }: { stampId: string; className?: string }) {
  const s = stampById(stampId);
  const Icon = s.icon;
  return (
    <div
      className={cn("stamp-perf aspect-[4/5] bg-[#FDFBF7] p-[7%] drop-shadow-[0_2px_3px_rgba(0,0,0,0.18)]", className)}
      style={{ containerType: "inline-size" }}
    >
      <div className={cn("flex h-full w-full flex-col items-center justify-between bg-gradient-to-br py-[10%] text-white", s.gradient)}>
        <span className="font-mono leading-none" style={{ fontSize: "13cqw" }}>{s.value}</span>
        <Icon style={{ width: "42cqw", height: "42cqw" }} strokeWidth={1.6} />
        <span className="font-mono leading-none tracking-wider" style={{ fontSize: "9cqw" }}>{s.subtext}</span>
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
