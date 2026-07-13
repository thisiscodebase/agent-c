"use client";

import { HighlighterIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

type Rating = "good" | "bad";

export function ThreadHighlightButton({
  threadId,
  messageId,
}: {
  threadId: string;
  messageId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<Rating | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/threads/${threadId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          messageId,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      toast.success(
        rating === "good" ? "Thanks — marked as a strong thread" : "Thanks — marked for review",
      );
      setOpen(false);
      setRating(undefined);
      setComment("");
    }
    catch {
      toast.error("Could not save highlight. Try again.");
    }
    finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setRating(undefined);
          setComment("");
        }
      }}
    >
      <DialogTrigger
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        type="button"
      >
        <HighlighterIcon className="size-3.5" />
        <span className="font-medium">Highlight</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Highlight this thread</DialogTitle>
          <DialogDescription>
            Mark an exceptionally good or bad run so we can compare them and tune Agent C.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            className={cn(
              "flex-1 justify-center gap-2",
              rating === "good" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
            )}
            type="button"
            variant="outline"
            onClick={() => setRating("good")}
          >
            <ThumbsUpIcon className="size-4" />
            Good
          </Button>
          <Button
            className={cn(
              "flex-1 justify-center gap-2",
              rating === "bad" && "border-destructive/40 bg-destructive/10 text-destructive",
            )}
            type="button"
            variant="outline"
            onClick={() => setRating("bad")}
          >
            <ThumbsDownIcon className="size-4" />
            Bad
          </Button>
        </div>

        <Textarea
          placeholder="Optional note — what stood out?"
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!rating || submitting} type="button" onClick={() => void submit()}>
            {submitting ? "Saving…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
