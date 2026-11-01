import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, MailOpen, RotateCw, Send, Upload } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { CardFace, Design } from "@/lib/types";
import { HERO_IMAGE, SIZES, cardRatio } from "@/lib/postcard";
import { SiteHeader } from "@/components/SiteHeader";
import { PostcardView } from "@/components/postcard/PostcardView";
import { Stamp } from "@/components/postcard/Stamp";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEMO: CardFace = {
  front_image_url: HERO_IMAGE,
  orientation: "landscape",
  size: "standard",
  message:
    "Greetings from the valley! We floated over the hills at sunrise and I swear the whole village waved. Found a bakery with impossible cinnamon buns. Wish you were here — big hug!",
  recipient_name: "Alex",
  sender_name: "Sam",
  stamp_id: "vintage_airmail",
  seal_color: "#B83A28",
  date_str: "2026-06-01",
};

const STEPS = [
  { icon: Upload, title: "Design it", body: "Pick a whimsical illustration or upload your own photo. Choose landscape or portrait, standard, large or square." },
  { icon: Send, title: "Seal & send", body: "Write your note, lick a stamp (virtually), press the wax seal. Share a private link by WhatsApp, email, anywhere." },
  { icon: MailOpen, title: "They open it", body: "An envelope lands on their screen, the flap lifts, and your card slides out to flip. You'll see when it's opened." },
];

const FAQ = [
  { q: "Is it really free?", a: "Yes. Create and send as many postcards as you like — no credits, no subscription." },
  { q: "Does the recipient need an account?", a: "No. Anyone with the link can open the envelope and flip your card." },
  { q: "Can I see if it was opened?", a: "Every card on your dashboard shows how many times it was opened and when." },
  { q: "Can I use my own photo?", a: "Of course — upload a JPG, PNG or WEBP up to 8 MB, or choose from our illustrated designs." },
];

export default function Home() {
  const [flipped, setFlipped] = useState(false);
  const { data: designs = [] } = useQuery({ queryKey: ["designs"], queryFn: () => apiGet<Design[]>("/designs") });
  const strip = designs.length ? [...designs, ...designs] : [];

  return (
    <div className="paper-grain min-h-screen text-ink">
      <SiteHeader />

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-terracotta/25 bg-[#FAF0E6] px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-terracotta">
            <span className="size-1.5 rounded-full bg-terracotta" /> for every little moment
          </p>
          <h1 data-testid="hero-title" className="font-serif text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Send a card that feels like <em className="text-terracotta">real mail.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
            Design a whimsical postcard from your own photo or our illustrations, then share a private link that
            opens from a paper envelope — right in their browser.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/sign-up"
              data-testid="hero-cta-start-button"
              className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-7 text-base shadow-[0_4px_0_#7d3424] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0.5")}
            >
              Send your first card free <ArrowRight className="size-4" />
            </Link>
            <a href="#how" data-testid="hero-how-link" className="text-sm font-semibold text-ink underline decoration-terracotta/40 decoration-2 underline-offset-4 hover:decoration-terracotta">
              How it works
            </a>
          </div>
          <div className="mt-10 flex items-center gap-3">
            {["vintage_airmail", "botanical_flora", "heart_seal"].map((s, i) => (
              <div key={s} style={{ transform: `rotate(${(i - 1) * 8}deg)` }}>
                <Stamp stampId={s} className="w-11" />
              </div>
            ))}
            <p className="ml-2 text-sm text-ink-muted">Free forever · no account needed to receive</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative lg:col-span-7"
        >
          <div className="absolute -top-6 right-6 hidden w-40 rotate-6 animate-float-slow sm:block" style={{ ["--tilt" as string]: "8deg" }}>
            {designs[2] && <img src={designs[2].url} alt="" className="rounded-[2px] border-[5px] border-cardstock shadow-lg" />}
          </div>
          <div className="absolute -bottom-10 -left-4 hidden w-36 animate-float-slow sm:block" style={{ ["--tilt" as string]: "-9deg", animationDelay: "1.5s" }}>
            {designs[4] && <img src={designs[4].url} alt="" className="rounded-[2px] border-[5px] border-cardstock shadow-lg" />}
          </div>
          <div className="relative mx-auto w-full max-w-xl -rotate-2 transition-transform duration-500 hover:rotate-0">
            <PostcardView card={DEMO} flipped={flipped} onFlip={() => setFlipped((f) => !f)} testId="hero-demo-postcard" />
          </div>
          <button
            data-testid="hero-flip-button"
            onClick={() => setFlipped((f) => !f)}
            className="mx-auto mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink-muted transition-colors hover:text-terracotta"
          >
            <RotateCw className="size-3.5" /> Tap the card to flip it
          </button>
        </motion.div>
      </section>

      {/* HOW */}
      <section id="how" className="border-y border-border/70 bg-panel/70">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-terracotta">three little steps</p>
          <h2 className="mt-2 font-serif text-4xl tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.12 }}
                className={cn(
                  "relative rounded-2xl border border-border bg-cardstock p-7 shadow-[0_10px_30px_-12px_rgba(44,24,16,0.15)] transition-transform duration-300 hover:-translate-y-1.5",
                  i === 1 && "md:mt-10",
                  i === 2 && "md:mt-20",
                )}
                data-testid={`how-step-${i + 1}`}
              >
                <span className="absolute -top-4 right-6 font-serif text-6xl italic text-terracotta/15">{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-full bg-[#FAF0E6] text-terracotta">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DESIGNS STRIP */}
      <section className="overflow-hidden py-20">
        <div className="mx-auto mb-10 flex max-w-7xl items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-terracotta">the design drawer</p>
            <h2 className="mt-2 font-serif text-4xl tracking-tight">Whimsical fronts, ready to go</h2>
          </div>
          <Link to="/app/new" data-testid="designs-start-link" className="hidden text-sm font-semibold text-terracotta hover:underline sm:block">
            Start designing →
          </Link>
        </div>
        <div className="relative">
          <div className="flex w-max animate-marquee gap-6 hover:[animation-play-state:paused]" data-testid="designs-marquee">
            {strip.map((d, i) => (
              <div
                key={`${d.id}-${i}`}
                className="h-56 shrink-0 rounded-[2px] border-[6px] border-cardstock bg-cardstock shadow-[0_12px_28px_-10px_rgba(44,24,16,0.3)] transition-transform duration-300 hover:-translate-y-2"
                style={{ aspectRatio: cardRatio("standard", d.orientation), transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}
              >
                <img src={d.url} alt={d.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIZES */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 rounded-3xl bg-ink p-8 text-[#FDFCFA] sm:p-12 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">pick your paper</p>
            <h2 className="mt-2 font-serif text-4xl tracking-tight">Every shape a postcard can be</h2>
            <p className="mt-4 max-w-md leading-relaxed text-[#C2B8AE]">
              Landscape or portrait. Classic 6×4, roomy 7×5, or a dreamy square. Switch any time while you design.
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-center gap-6">
            {SIZES.map((s) => (
              <div key={s.value} className="flex flex-col items-center gap-3">
                <div
                  className="w-24 rounded-[2px] border-2 border-dashed border-gold/60 bg-white/5 transition-transform duration-300 hover:-rotate-3 sm:w-28"
                  style={{ aspectRatio: cardRatio(s.value, "landscape") }}
                />
                <span className="font-mono text-xs uppercase tracking-widest text-[#C2B8AE]">{s.label} · {s.inches}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6 lg:px-8">
        <h2 className="font-serif text-4xl tracking-tight">Good to know</h2>
        <dl className="mt-8 divide-y divide-border border-y border-border">
          {FAQ.map((f, i) => (
            <div key={f.q} className="grid gap-2 py-6 sm:grid-cols-3" data-testid={`faq-item-${i}`}>
              <dt className="font-semibold">{f.q}</dt>
              <dd className="text-ink-muted sm:col-span-2">{f.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-14 text-center">
          <h3 className="font-serif text-3xl italic">Someone's day could use a postcard.</h3>
          <Link
            to="/sign-up"
            data-testid="footer-cta-button"
            className={cn(buttonVariants({ size: "lg" }), "mt-6 h-12 rounded-full px-7 text-base shadow-[0_4px_0_#7d3424]")}
          >
            Write one now <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
        Whimsy Post · made with paper & pixels
      </footer>
    </div>
  );
}
