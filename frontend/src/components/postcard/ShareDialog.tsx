import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Copy, ExternalLink, Mail, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shareUrl } from "@/lib/postcard";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareId: string;
  recipient: string;
}

export function ShareDialog({ open, onOpenChange, shareId, recipient }: ShareDialogProps) {
  const url = shareUrl(shareId);
  const text = `A little postcard for you${recipient ? `, ${recipient}` : ""} ✉️ ${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — off it goes!");
    } catch {
      toast.error("Couldn't copy automatically — select the link and copy it.");
    }
  };
  const external = cn(buttonVariants({ variant: "outline" }), "h-11 justify-start gap-2");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="share-dialog" className="bg-panel sm:max-w-md">
        <div className="airmail-border -mx-4 -mt-4 mb-1 h-2 rounded-t-xl" />
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Sealed & ready to send</DialogTitle>
          <DialogDescription>
            Share this private link. It opens as an envelope{recipient ? ` for ${recipient}` : ""} — no account needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={url} data-testid="share-link-input" className="h-11 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button data-testid="share-copy-button" className="h-11 px-4" onClick={copy}>
            <Copy className="size-4" /> Copy
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <a data-testid="share-whatsapp-link" className={external} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4 text-sage" /> WhatsApp
          </a>
          <a data-testid="share-email-link" className={external} href={`mailto:?subject=${encodeURIComponent("You've got mail!")}&body=${encodeURIComponent(text)}`}>
            <Mail className="size-4 text-postal" /> Email
          </a>
          <Link data-testid="share-preview-link" className={external} to={`/p/${shareId}`} target="_blank">
            <ExternalLink className="size-4 text-terracotta" /> Preview
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
