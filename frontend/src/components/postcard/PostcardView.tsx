import { ImageIcon } from "lucide-react";
import type { CardFace } from "@/lib/types";
import { cardRatio, formatCardDate } from "@/lib/postcard";
import { Postmark, Stamp } from "@/components/postcard/Stamp";
import { cn } from "@/lib/utils";

interface PostcardViewProps {
  card: CardFace;
  flipped?: boolean;
  onFlip?: () => void;
  className?: string;
  testId?: string;
  /** Thumbnails skip the back face entirely. */
  frontOnly?: boolean;
}

const SHADOW = "0 18px 40px -12px rgba(44,24,16,0.28), 0 4px 8px -2px rgba(44,24,16,0.08)";

function Front({ card }: { card: CardFace }) {
  return card.front_image_url ? (
    <img src={card.front_image_url} alt="Postcard front" className="h-full w-full object-cover" draggable={false} />
  ) : (
    <div className="grid h-full w-full place-items-center bg-envelope-in text-ink-muted">
      <div className="flex flex-col items-center gap-2">
        <ImageIcon style={{ width: "8cqw", height: "8cqw" }} />
        <span style={{ fontSize: "3cqw" }}>Choose a design or upload a photo</span>
      </div>
    </div>
  );
}

function Back({ card }: { card: CardFace }) {
  const portrait = card.orientation === "portrait" && card.size !== "square";
  const msgSize = portrait ? "5.4cqw" : card.size === "square" ? "4.1cqw" : "3.3cqw";
  const labelSize = portrait ? "4cqw" : "2.6cqw";
  const date = formatCardDate(card.date_str);

  const message = (
    <p
      data-testid="postcard-back-message"
      className="overflow-hidden font-serif italic leading-relaxed whitespace-pre-wrap text-slate-800"
      style={{ fontSize: msgSize }}
    >
      {card.message || "Your message will appear here, written in your very best hand…"}
    </p>
  );

  const address = (
    <div className="flex flex-col gap-[0.6em]" style={{ fontSize: labelSize }}>
      <p className="font-mono uppercase tracking-[0.18em] text-ink-muted" style={{ fontSize: "0.75em" }}>{date}</p>
      <div className="flex items-end gap-2 border-b border-dashed border-[#D6CEBF] pb-1">
        <span className="font-mono text-[0.75em] uppercase text-ink-muted">To</span>
        <span data-testid="postcard-back-recipient" className="font-serif italic text-ink" style={{ fontSize: "1.25em" }}>
          {card.recipient_name || "Someone dear"}
        </span>
      </div>
      <div className="flex items-end gap-2 border-b border-dashed border-[#D6CEBF] pb-1">
        <span className="font-mono text-[0.75em] uppercase text-ink-muted">From</span>
        <span data-testid="postcard-back-sender" className="font-serif italic text-ink" style={{ fontSize: "1.25em" }}>
          {card.sender_name || "You"}
        </span>
      </div>
    </div>
  );

  if (portrait) {
    return (
      <div className="flex h-full flex-col gap-[4%] p-[7%]">
        <div className="flex items-start justify-between">
          <Postmark date={card.date_str.split("-").reverse().join(".")} className="w-[46%] -rotate-6" />
          <Stamp stampId={card.stamp_id} className="w-[24%] rotate-3" />
        </div>
        <div className="min-h-0 flex-1">{message}</div>
        <div className="border-t border-[#D6CEBF] pt-[4%]">{address}</div>
      </div>
    );
  }
  return (
    <div className="grid h-full grid-cols-[1.15fr_auto_1fr] gap-[4%] p-[5.5%]">
      <div className="min-h-0">{message}</div>
      <div className="w-px bg-[#D6CEBF]" />
      <div className="relative flex flex-col justify-between">
        <div className="flex items-start justify-end">
          <Postmark date={card.date_str.split("-").reverse().join(".")} className="absolute -left-[6%] top-[6%] w-[62%] -rotate-6" />
          <Stamp stampId={card.stamp_id} className="w-[34%] rotate-3" />
        </div>
        {address}
      </div>
    </div>
  );
}

export function PostcardView({ card, flipped = false, onFlip, className, testId = "postcard-view", frontOnly }: PostcardViewProps) {
  const ratio = cardRatio(card.size, card.orientation);
  const face = "absolute inset-0 overflow-hidden rounded-[3px] bg-cardstock";
  return (
    <div
      data-testid={testId}
      className={cn("relative w-full select-none", onFlip && "cursor-pointer", className)}
      style={{ aspectRatio: ratio, perspective: "1400px", containerType: "inline-size" }}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (onFlip && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onFlip();
        }
      }}
      role={onFlip ? "button" : undefined}
      tabIndex={onFlip ? 0 : undefined}
      aria-label={onFlip ? (flipped ? "Flip postcard to front" : "Flip postcard to back") : undefined}
    >
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.8s cubic-bezier(0.34, 1.4, 0.64, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div className={cn(face, "border-[6px] border-cardstock")} style={{ backfaceVisibility: "hidden", boxShadow: SHADOW }}>
          <Front card={card} />
        </div>
        {!frontOnly && (
          <div
            className={face}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", boxShadow: SHADOW }}
          >
            <Back card={card} />
          </div>
        )}
      </div>
    </div>
  );
}
