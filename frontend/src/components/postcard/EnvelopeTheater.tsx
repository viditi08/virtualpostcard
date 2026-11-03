import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RotateCw } from "lucide-react";
import type { CardFace } from "@/lib/types";
import { PostcardView } from "@/components/postcard/PostcardView";
import { cardRatio } from "@/lib/postcard";
import { Button } from "@/components/ui/button";

type Stage = "sealed" | "opening" | "sliding" | "card";

const CONFETTI_COLORS = ["#A34832", "#2B4C6F", "#3D6B52", "#C8963E", "#E8A0A0"];
// Deterministic pseudo-random spread so renders are pure.
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: (r(1) - 0.5) * 900, y: -200 - r(2) * 380, rot: r(3) * 540, delay: r(4) * 0.25, color: CONFETTI_COLORS[i % 5], w: 6 + r(5) * 8 };
});

interface EnvelopeTheaterProps {
  card: CardFace;
  onOpened: () => void;
}

export function EnvelopeTheater({ card, onOpened }: EnvelopeTheaterProps) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("sealed");
  const [flipped, setFlipped] = useState(false);

  const open = () => {
    if (stage !== "sealed") return;
    onOpened();
    if (reduce) {
      setStage("card");
      return;
    }
    setStage("opening");
    setTimeout(() => setStage("sliding"), 750);
    setTimeout(() => setStage("card"), 1900);
  };

  const flapOpen = stage !== "sealed";
  const cardOut = stage === "sliding";
  const wide = card.orientation === "landscape" || card.size === "square";

  return (
    <div className="relative flex w-full flex-col items-center">
      <AnimatePresence mode="wait">
        {stage !== "card" ? (
          <motion.div
            key="envelope"
            initial={{ opacity: 0, y: 30, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: 60, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            className="relative mt-[18vh] w-[min(92vw,620px)] sm:mt-[14vh]"
            style={{ perspective: "1600px" }}
          >
            <div className="relative aspect-[3/2] w-full" data-testid="envelope">
              {/* back of envelope */}
              <div className="absolute inset-0 rounded-md bg-envelope-in shadow-[0_24px_50px_-14px_rgba(44,24,16,0.35)]" />
              {/* card inside */}
              <motion.div
                className="absolute inset-x-[7%] top-[6%] bottom-[6%] overflow-hidden rounded-[2px] border-[5px] border-cardstock bg-cardstock shadow-md"
                style={{ zIndex: 10 }}
                animate={{ y: cardOut ? "-62%" : "0%" }}
                transition={{ type: "spring", stiffness: 70, damping: 14 }}
              >
                {card.front_image_url && <img src={card.front_image_url} alt="" className="h-full w-full object-cover" />}
              </motion.div>
              {/* front pocket */}
              <div
                className="absolute inset-0 rounded-md bg-envelope"
                style={{ zIndex: 20, clipPath: "polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)" }}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-md"
                style={{ zIndex: 21, background: "linear-gradient(160deg, transparent 55%, rgba(44,24,16,0.06))", clipPath: "polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)" }}
              />
              <div className="absolute bottom-[10%] left-[8%] z-[22]">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted sm:text-xs">Special delivery for</p>
                <p data-testid="envelope-recipient-name" className="font-serif text-2xl italic text-ink sm:text-3xl">
                  {card.recipient_name || "you"}
                </p>
              </div>
              <div className="airmail-border absolute bottom-0 inset-x-0 z-[22] h-1.5 rounded-b-md opacity-80" />
              {/* top flap */}
              <motion.div
                className="absolute inset-x-0 top-0 h-[58%] origin-top"
                style={{
                  zIndex: flapOpen ? 5 : 30,
                  clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                  background: "linear-gradient(180deg, #E8DCC9, #E2D3BE)",
                  transformStyle: "preserve-3d",
                }}
                animate={{ rotateX: flapOpen ? 180 : 0 }}
                transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
              />
              {/* wax seal */}
              <AnimatePresence>
                {stage === "sealed" && (
                  <motion.button
                    key="seal"
                    data-testid="wax-seal-button"
                    onClick={open}
                    aria-label="Break the seal to open"
                    className="absolute left-1/2 top-[58%] z-40 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-serif text-3xl italic text-white sm:size-24"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${card.seal_color} 70%, white), ${card.seal_color} 55%, color-mix(in srgb, ${card.seal_color} 70%, black))`,
                      boxShadow: `0 6px 16px -4px ${card.seal_color}aa, inset 0 -3px 6px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.25)`,
                    }}
                    whileHover={{ scale: 1.08, rotate: -6 }}
                    whileTap={{ scale: 0.92 }}
                    exit={{ scale: 1.6, opacity: 0, rotate: 30, transition: { duration: 0.35 } }}
                  >
                    <span className="drop-shadow-[0_1px_0_rgba(0,0,0,0.3)]">{(card.sender_name || "W").charAt(0).toUpperCase()}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {stage === "sealed" && (
                <motion.p
                  exit={{ opacity: 0 }}
                  className="mt-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-ink-muted"
                  data-testid="tap-to-open-hint"
                >
                  <span className="inline-block animate-wiggle">✦</span> Tap the seal to open <span className="inline-block animate-wiggle">✦</span>
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.8, y: 80 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 110, damping: 15 }}
            className="relative mt-8 flex w-full flex-col items-center sm:mt-12"
          >
            {!reduce && (
              <div className="pointer-events-none absolute left-1/2 top-1/3 z-50">
                {CONFETTI.map((c, i) => (
                  <motion.span
                    key={i}
                    className="absolute block rounded-[1px]"
                    style={{ width: c.w, height: c.w * 0.45, background: c.color }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: c.x, y: [0, c.y, c.y + 520], opacity: [1, 1, 0], rotate: c.rot }}
                    transition={{ duration: 2.6, delay: c.delay, ease: "easeOut" }}
                  />
                ))}
              </div>
            )}
            <div style={{ width: `min(${wide ? "94vw, 760px" : "86vw, 440px"}, ${(72 * cardRatio(card.size, card.orientation)).toFixed(1)}vh)` }}>
              <PostcardView card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} testId="recipient-postcard" />
            </div>
            <Button
              data-testid="flip-card-button"
              variant="outline"
              className="mt-8 h-11 rounded-full bg-panel px-6"
              onClick={() => setFlipped((f) => !f)}
            >
              <RotateCw className="size-4" /> {flipped ? "See the front" : "Flip to read the message"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
