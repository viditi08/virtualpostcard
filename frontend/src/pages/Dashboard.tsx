import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Copy, Eye, Inbox, MailOpen, PenLine, Plus, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { apiDelete, apiGet } from "@/lib/api";
import type { Postcard, Profile } from "@/lib/types";
import { shareUrl } from "@/lib/postcard";
import { queryClient } from "@/lib/queryClient";
import { SiteHeader } from "@/components/SiteHeader";
import { PostcardView } from "@/components/postcard/PostcardView";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function StatusBadge({ card }: { card: Postcard }) {
  if (card.is_draft) return <Badge variant="outline" data-testid={`postcard-status-${card.id}`}>Draft</Badge>;
  if (card.opened_count > 0)
    return (
      <Badge data-testid={`postcard-status-${card.id}`} className="bg-sage text-white">
        <MailOpen className="size-3" /> Opened {card.opened_count}×
      </Badge>
    );
  return (
    <Badge data-testid={`postcard-status-${card.id}`} className="bg-postal text-white">
      <Send className="size-3" /> Sent
    </Badge>
  );
}

function PostcardTile({ card, index, onDelete }: { card: Postcard; index: number; onDelete: (c: Postcard) => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(card.share_id));
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      data-testid={`postcard-tile-${card.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-panel p-4 shadow-[0_8px_24px_-14px_rgba(44,24,16,0.25)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_-16px_rgba(44,24,16,0.35)]"
    >
      <Link to={`/app/edit/${card.id}`} className="grid h-48 place-items-center rounded-xl bg-[#F3ECE1] p-4" data-testid={`postcard-thumb-${card.id}`}>
        <div
          className={cn(
            "transition-transform duration-300 group-hover:-rotate-2",
            card.size === "square" ? "w-[150px]" : card.orientation === "portrait" ? "w-[106px]" : "w-full max-w-[230px]",
          )}
        >
          <PostcardView card={card} frontOnly testId={`postcard-thumb-view-${card.id}`} />
        </div>
      </Link>
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-lg" data-testid={`postcard-title-${card.id}`}>{card.title}</h3>
          <p className="truncate text-sm text-ink-muted">
            {card.recipient_name ? `To ${card.recipient_name}` : "No recipient yet"} · {formatDistanceToNow(new Date(card.updated_at), { addSuffix: true })}
          </p>
        </div>
        <StatusBadge card={card} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Link to={`/app/edit/${card.id}`} data-testid={`postcard-edit-${card.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <PenLine className="size-3.5" /> Edit
        </Link>
        {!card.is_draft && (
          <>
            <Button variant="outline" size="sm" onClick={copy} data-testid={`postcard-copy-link-${card.id}`}>
              <Copy className="size-3.5" /> Link
            </Button>
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="sm" data-testid={`postcard-activity-${card.id}`} />}>
                <Eye className="size-3.5" /> Activity
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-panel" data-testid={`postcard-activity-panel-${card.id}`}>
                <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">Opened {card.opened_count} times</p>
                {card.opens.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">Not opened yet — the envelope is still sealed.</p>
                ) : (
                  <ul className="mt-2 max-h-56 space-y-1.5 overflow-auto text-sm">
                    {[...card.opens].reverse().map((o, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>{format(new Date(o.at), "MMM d, HH:mm")}</span>
                        <span className="truncate text-ink-muted">{/mobile/i.test(o.device) ? "Phone" : "Computer"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-ink-muted hover:text-destructive"
          onClick={() => onDelete(card)}
          data-testid={`postcard-delete-${card.id}`}
          aria-label="Delete postcard"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </motion.article>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Postcard | null>(null);
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<Profile>("/me") });
  const cards = useQuery({ queryKey: ["postcards"], queryFn: () => apiGet<Postcard[]>("/postcards") });

  const del = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/postcards/${id}`),
    onSuccess: () => {
      toast.success("Postcard tossed in the bin");
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["postcards"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error("Couldn't delete that postcard"),
  });

  const list = (cards.isError ? [] : cards.data ?? []).filter((c) =>
    `${c.title} ${c.recipient_name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const all = cards.data ?? [];
  const stats = [
    { label: "Postcards", value: all.length, testid: "stat-total" },
    { label: "Sent", value: all.filter((c) => !c.is_draft).length, testid: "stat-sent" },
    { label: "Opened", value: all.filter((c) => c.opened_count > 0).length, testid: "stat-opened" },
  ];
  const firstName = me.data?.name?.split(" ")[0];

  return (
    <div className="paper-grain min-h-screen text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-terracotta">your postal desk</p>
            <h1 data-testid="dashboard-title" className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
              {firstName ? `Hello, ${firstName}` : "Your postcards"}
            </h1>
            <p className="mt-2 text-ink-muted" data-testid="dashboard-email">
              {me.data?.email ? `Signed in as ${me.data.email}` : "Every card you've designed, in one warm place."}
            </p>
          </div>
          <div className="flex gap-3">
            {stats.map((s) => (
              <div key={s.label} className="min-w-24 rounded-2xl border border-border bg-panel px-5 py-3">
                <p className="font-serif text-3xl" data-testid={s.testid}>{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            data-testid="dashboard-search-input"
            placeholder="Search by title or recipient"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 max-w-sm bg-panel"
          />
          <Link
            to="/app/new"
            data-testid="dashboard-new-postcard-button"
            className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-6 shadow-[0_3px_0_#7d3424]")}
          >
            <Plus className="size-4" /> Write a new postcard
          </Link>
        </div>

        <div className="mt-8">
          {cards.isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-panel" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div data-testid="dashboard-empty-state" className="flex flex-col items-center rounded-3xl border-2 border-dashed border-border bg-panel/60 px-6 py-20 text-center">
              <Inbox className="size-10 text-terracotta" />
              <h2 className="mt-4 font-serif text-2xl">{search ? "No postcards match that" : "Your mailbox is empty"}</h2>
              <p className="mt-2 max-w-sm text-ink-muted">
                {cards.isError ? "We couldn't reach the post office just now." : "Make someone's day — your first postcard takes about two minutes."}
              </p>
              {!search && (
                <Link to="/app/new" data-testid="empty-new-postcard-button" className={cn(buttonVariants(), "mt-6 rounded-full px-6")}>
                  <PenLine className="size-4" /> Design a postcard
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="postcard-grid">
              {list.map((c, i) => (
                <PostcardTile key={c.id} card={c} index={i} onDelete={setToDelete} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="bg-panel" data-testid="delete-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Delete “{toDelete?.title}”?</DialogTitle>
            <DialogDescription>Its share link will stop working. This can't be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" data-testid="delete-cancel-button" />}>Keep it</DialogClose>
            <Button
              variant="destructive"
              data-testid="delete-confirm-button"
              disabled={del.isPending}
              onClick={() => toDelete && del.mutate(toDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
