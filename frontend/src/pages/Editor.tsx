import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/auth/session";
import { toast } from "sonner";
import { ArrowLeft, Check, ImagePlus, Loader2, RotateCw, Save, Stamp as StampIcon } from "lucide-react";
import { apiGet, apiPost, apiPut, apiUpload, errorMessage } from "@/lib/api";
import type { CardFace, Design, Postcard, PostcardIn, TodayOut, UploadOut } from "@/lib/types";
import { SEAL_COLORS, SIZES, STAMPS, STAMP_CATEGORIES, cardRatio, type StampCategory } from "@/lib/postcard";
import { queryClient } from "@/lib/queryClient";
import { SiteHeader } from "@/components/SiteHeader";
import { PostcardView } from "@/components/postcard/PostcardView";
import { Stamp } from "@/components/postcard/Stamp";
import { ShareDialog } from "@/components/postcard/ShareDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MESSAGE_MAX = 600;

const BLANK: PostcardIn = {
  title: "",
  front_image_url: "",
  orientation: "landscape",
  size: "standard",
  message: "",
  recipient_name: "",
  sender_name: "",
  stamp_id: "vintage_airmail",
  seal_color: "#B83A28",
  is_draft: true,
};

function toInput(c: Postcard): PostcardIn {
  const { title, front_image_url, orientation, size, message, recipient_name, sender_name, stamp_id, seal_color, is_draft } = c;
  return { title, front_image_url, orientation, size, message, recipient_name, sender_name, stamp_id, seal_color, is_draft };
}

function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5",
        active ? "border-terracotta bg-[#FAF0E6] text-ink" : "border-border bg-panel text-ink-muted hover:border-terracotta/40",
      )}
    >
      {children}
    </button>
  );
}

function EditorForm({ initial, existing }: { initial: PostcardIn; existing?: Postcard }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PostcardIn>(initial);
  const [stampCat, setStampCat] = useState<StampCategory | "all">("all");
  const [flipped, setFlipped] = useState(false);
  const [shareOpen, setShareOpen] = useState(Boolean((location.state as { share?: boolean } | null)?.share));
  const set = <K extends keyof PostcardIn>(k: K, v: PostcardIn[K]) => setForm((f) => ({ ...f, [k]: v }));

  const designs = useQuery({ queryKey: ["designs"], queryFn: () => apiGet<Design[]>("/designs") });
  const today = useQuery({ queryKey: ["today"], queryFn: () => apiGet<TodayOut>("/today") });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiUpload<UploadOut>("/uploads", fd);
    },
    onSuccess: (r) => {
      set("front_image_url", r.url);
      setFlipped(false);
      toast.success("Photo added to the front");
    },
    onError: (e) => toast.error(errorMessage(e, "Upload failed")),
  });

  const save = useMutation({
    mutationFn: (body: PostcardIn) =>
      existing ? apiPut<Postcard>(`/postcards/${existing.id}`, body) : apiPost<Postcard>("/postcards", body),
    onSuccess: (card, body) => {
      queryClient.setQueryData(["postcard", card.id], card);
      queryClient.invalidateQueries({ queryKey: ["postcards"] });
      if (!body.is_draft) {
        if (existing) setShareOpen(true);
        else navigate(`/app/edit/${card.id}`, { replace: true, state: { share: true } });
      } else {
        toast.success("Draft saved");
        if (!existing) navigate(`/app/edit/${card.id}`, { replace: true });
      }
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't save your postcard")),
  });

  const submit = (draft: boolean) => {
    if (!form.front_image_url) {
      toast.error("Choose a design or upload a photo for the front first");
      return;
    }
    const body = { ...form, title: form.title.trim() || (form.recipient_name ? `For ${form.recipient_name}` : "Untitled postcard"), is_draft: draft };
    setForm(body);
    save.mutate(body);
  };

  const face: CardFace = { ...form, date_str: existing?.date_str ?? today.data?.date ?? "" };
  const ratio = cardRatio(form.size, form.orientation);
  const previewWidth = ratio >= 1 ? "w-full max-w-2xl" : "w-full max-w-[min(380px,100%)]";

  return (
    <div className="paper-grain min-h-screen text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/app" data-testid="editor-back-link" className="grid size-9 place-items-center rounded-full border border-border bg-panel transition-colors hover:bg-accent" aria-label="Back to dashboard">
              <ArrowLeft className="size-4" />
            </Link>
            <Input
              data-testid="editor-title-input"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Name this postcard"
              maxLength={120}
              className="h-10 w-64 border-transparent bg-transparent font-serif text-xl shadow-none hover:border-border focus-visible:bg-panel sm:w-80"
            />
            {existing && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted" data-testid="editor-status">
                {existing.is_draft ? "Draft" : "Sent"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 bg-panel" disabled={save.isPending} onClick={() => submit(true)} data-testid="editor-save-draft-button">
              <Save className="size-4" /> Save draft
            </Button>
            <Button className="h-10 rounded-full px-5 shadow-[0_3px_0_#7d3424]" disabled={save.isPending} onClick={() => submit(false)} data-testid="editor-seal-send-button">
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <StampIcon className="size-4" />}
              {existing && !existing.is_draft ? "Update & share" : "Seal & send"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* PREVIEW */}
          <section className="lg:col-span-7">
            <div className="sticky top-24 flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-border bg-[#F3ECE1] p-6 sm:p-10">
              <div className={cn(previewWidth, "transition-[max-width] duration-500")}>
                <PostcardView card={face} flipped={flipped} onFlip={() => setFlipped((f) => !f)} testId="editor-preview-postcard" />
              </div>
              <div className="mt-6 flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full bg-panel" onClick={() => setFlipped((f) => !f)} data-testid="editor-flip-button">
                  <RotateCw className="size-3.5" /> {flipped ? "Show front" : "Show back"}
                </Button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted" data-testid="editor-format-label">
                  {SIZES.find((s) => s.value === form.size)?.inches} · {form.size === "square" ? "square" : form.orientation}
                </span>
              </div>
            </div>
          </section>

          {/* CONTROLS */}
          <section className="rounded-3xl border border-border bg-panel p-5 shadow-[0_10px_30px_-18px_rgba(44,24,16,0.3)] sm:p-6 lg:col-span-5">
            <Tabs defaultValue="front" onValueChange={(v) => setFlipped(v === "message" || v === "stamp")}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="front" data-testid="editor-tab-front">Front</TabsTrigger>
                <TabsTrigger value="format" data-testid="editor-tab-format">Format</TabsTrigger>
                <TabsTrigger value="message" data-testid="editor-tab-message">Message</TabsTrigger>
                <TabsTrigger value="stamp" data-testid="editor-tab-stamp">Stamp</TabsTrigger>
              </TabsList>

              <TabsContent value="front" className="mt-5 space-y-5">
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    data-testid="editor-upload-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload.mutate(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    data-testid="editor-upload-button"
                    onClick={() => fileRef.current?.click()}
                    disabled={upload.isPending}
                    className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-terracotta/40 bg-[#FAF0E6]/60 p-5 text-left transition-[border-color,background-color] duration-200 hover:border-terracotta hover:bg-[#FAF0E6]"
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-terracotta text-white">
                      {upload.isPending ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                    </span>
                    <span>
                      <span className="block font-semibold">Upload your own photo</span>
                      <span className="text-sm text-ink-muted">JPG, PNG, WEBP or GIF · up to 8 MB</span>
                    </span>
                  </button>
                </div>
                <div>
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">or pick a whimsical design</p>
                  <div className="grid grid-cols-3 gap-3" data-testid="editor-design-grid">
                    {(designs.data ?? []).map((d) => {
                      const active = form.front_image_url === d.url;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          data-testid={`editor-design-${d.id}`}
                          onClick={() => {
                            setForm((f) => ({ ...f, front_image_url: d.url, orientation: f.size === "square" ? f.orientation : d.orientation }));
                            setFlipped(false);
                          }}
                          className={cn(
                            "group relative aspect-square overflow-hidden rounded-xl border-2 transition-[border-color,transform] duration-200 hover:-translate-y-0.5",
                            active ? "border-terracotta" : "border-transparent",
                          )}
                          title={d.title}
                        >
                          <img src={d.url} alt={d.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                          {active && (
                            <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-terracotta text-white">
                              <Check className="size-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="format" className="mt-5 space-y-6">
                <div>
                  <Label className="mb-3 block">Orientation</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["landscape", "portrait"] as const).map((o) => (
                      <Chip key={o} testId={`editor-orientation-${o}`} active={form.orientation === o && form.size !== "square"} onClick={() => setForm((f) => ({ ...f, orientation: o, size: f.size === "square" ? "standard" : f.size }))}>
                        <span className={cn("rounded-[2px] border-2 border-current", o === "landscape" ? "h-7 w-10" : "h-10 w-7")} />
                        <span className="capitalize">{o}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Size</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {SIZES.map((s) => (
                      <Chip key={s.value} testId={`editor-size-${s.value}`} active={form.size === s.value} onClick={() => set("size", s.value)}>
                        <span className="rounded-[2px] border-2 border-current" style={{ width: 40, aspectRatio: cardRatio(s.value, "landscape") }} />
                        <span>{s.label}</span>
                        <span className="font-mono text-[10px] text-ink-muted">{s.inches}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="message" className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="to">To</Label>
                    <Input id="to" data-testid="editor-recipient-input" value={form.recipient_name} maxLength={80} onChange={(e) => set("recipient_name", e.target.value)} placeholder="Grandma Rose" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="from">From</Label>
                    <Input id="from" data-testid="editor-sender-input" value={form.sender_name} maxLength={80} onChange={(e) => set("sender_name", e.target.value)} placeholder="Your name" className="h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="msg">Your message</Label>
                    <span className="font-mono text-[10px] text-ink-muted" data-testid="editor-message-count">{form.message.length}/{MESSAGE_MAX}</span>
                  </div>
                  <Textarea
                    id="msg"
                    data-testid="editor-message-input"
                    value={form.message}
                    maxLength={MESSAGE_MAX}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Greetings from somewhere lovely…"
                    className="min-h-44 font-serif text-base italic leading-relaxed"
                  />
                </div>
              </TabsContent>

              <TabsContent value="stamp" className="mt-5 space-y-6">
                <div>
                  <Label className="mb-3 block">Stamp</Label>
                  <div className="mb-4 flex flex-wrap gap-1.5" data-testid="editor-stamp-categories">
                    {STAMP_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        data-testid={`editor-stamp-category-${c.value}`}
                        aria-pressed={stampCat === c.value}
                        onClick={() => setStampCat(c.value)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-[background-color,color,border-color] duration-200",
                          stampCat === c.value ? "border-terracotta bg-terracotta text-white" : "border-border bg-panel text-ink-muted hover:border-terracotta/50 hover:text-ink",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-5" data-testid="editor-stamp-grid">
                    {STAMPS.filter((s) => stampCat === "all" || s.category === stampCat).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        data-testid={`editor-stamp-${s.id}`}
                        title={s.name}
                        aria-pressed={form.stamp_id === s.id}
                        onClick={() => set("stamp_id", s.id)}
                        className={cn(
                          "rounded-lg p-1.5 transition-[background-color,box-shadow] duration-200",
                          form.stamp_id === s.id ? "bg-[#FAF0E6] ring-2 ring-terracotta" : "hover:bg-[#FAF0E6]/60",
                        )}
                      >
                        <Stamp stampId={s.id} photoUrl={form.front_image_url} interactive />
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-ink-muted" data-testid="editor-stamp-name">
                    {STAMPS.find((s) => s.id === form.stamp_id)?.name}
                    {form.stamp_id === "photo" && " — made from your card's front picture, vintage-tinted"}
                  </p>
                </div>
                <div>
                  <Label className="mb-3 block">Wax seal colour</Label>
                  <div className="flex gap-3">
                    {SEAL_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        data-testid={`editor-seal-${c.name.toLowerCase().replace(" ", "-")}`}
                        title={c.name}
                        onClick={() => set("seal_color", c.value)}
                        className={cn(
                          "size-10 rounded-full shadow-[inset_0_-3px_5px_rgba(0,0,0,0.25)] transition-transform duration-200 hover:scale-110",
                          form.seal_color === c.value && "ring-2 ring-ink ring-offset-2 ring-offset-panel",
                        )}
                        style={{ background: c.value }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">The seal your recipient breaks to open the envelope.</p>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
      {existing && (
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} shareId={existing.share_id} recipient={existing.recipient_name} />
      )}
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const { user } = useSession();
  const card = useQuery({
    queryKey: ["postcard", id],
    queryFn: () => apiGet<Postcard>(`/postcards/${id}`),
    enabled: Boolean(id),
  });

  if (!id) return <EditorForm key="new" initial={{ ...BLANK, sender_name: user?.firstName ?? "" }} />;
  if (card.data) return <EditorForm key={id} initial={toInput(card.data)} existing={card.data} />;
  return (
    <div className="paper-grain min-h-screen">
      <SiteHeader />
      <div className="grid place-items-center py-32 text-ink-muted" data-testid="editor-loading">
        {card.isError ? (
          <div className="text-center">
            <p className="font-serif text-2xl text-ink">We couldn't find that postcard.</p>
            <Link to="/app" className="mt-3 inline-block text-terracotta underline">Back to your postcards</Link>
          </div>
        ) : (
          <Loader2 className="size-6 animate-spin" />
        )}
      </div>
    </div>
  );
}
