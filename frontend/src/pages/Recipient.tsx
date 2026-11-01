import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PenLine } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { PublicPostcard } from "@/lib/types";
import { EnvelopeTheater } from "@/components/postcard/EnvelopeTheater";
import { Logo } from "@/components/SiteHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Recipient() {
  const { shareId = "" } = useParams();
  const recorded = useRef(false);
  const card = useQuery({
    queryKey: ["public-postcard", shareId],
    queryFn: () => apiGet<PublicPostcard>(`/public/postcards/${shareId}`),
    retry: false,
  });

  const recordOpen = () => {
    if (recorded.current) return;
    recorded.current = true;
    apiPost<void>(`/public/postcards/${shareId}/open`).catch(() => undefined);
  };

  return (
    <div className="paper-grain relative min-h-screen overflow-x-hidden pb-16 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,253,249,0.9)_0%,transparent_65%)]" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link to="/sign-up" data-testid="recipient-make-your-own-link" className="text-sm font-semibold text-terracotta hover:underline">
          Make your own →
        </Link>
      </header>
      <main className="relative z-10 flex flex-col items-center px-4">
        {card.isLoading && <Loader2 className="mt-40 size-6 animate-spin text-ink-muted" data-testid="recipient-loading" />}
        {card.isError && (
          <div className="mt-32 max-w-md text-center" data-testid="recipient-not-found">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-terracotta">return to sender</p>
            <h1 className="mt-3 font-serif text-4xl">This postcard got lost in the mail.</h1>
            <p className="mt-3 text-ink-muted">The link may be mistyped, or the sender has taken it back.</p>
          </div>
        )}
        {card.data && !card.isError && (
          <>
            <EnvelopeTheater card={card.data} onOpened={recordOpen} />
            <div className="mt-14 text-center">
              <p className="text-ink-muted">Want to send one back?</p>
              <Link
                to="/sign-up"
                data-testid="recipient-reply-button"
                className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-11 rounded-full bg-panel px-6")}
              >
                <PenLine className="size-4" /> Write your own postcard
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
