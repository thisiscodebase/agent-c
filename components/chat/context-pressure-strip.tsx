"use client";

import { XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const COPY =
  "Agent C handles long-running chats, but starting a new chat per task keeps answers sharper and avoids context bloat from compaction.";

export function ContextPressureStrip({
  onDismiss,
  className,
}: {
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg bg-muted/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
      role="status"
    >
      <p className="min-w-0 flex-1">{COPY}</p>
      {onDismiss ? (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="size-6 shrink-0 text-muted-foreground"
          aria-label="Dismiss context tip"
          onClick={onDismiss}
        >
          <XIcon className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
