"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "~/components/ui/popover";
import { formatTokenCount } from "~/lib/format-usage";
import {
  contextCategoriesForDisplay,
  type ContextCategoryKey,
  type ThreadContextBreakdown,
} from "~/lib/thread-context-breakdown";
import { cn } from "~/lib/utils";

const CATEGORY_BAR_CLASS: Record<ContextCategoryKey, string> = {
  system: "bg-zinc-400 dark:bg-zinc-500",
  tools: "bg-violet-500",
  mcp: "bg-fuchsia-500",
  skills: "bg-amber-700",
  conversation: "bg-orange-500",
  other: "bg-sky-600",
};

const RING_SIZE = 22;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function SegmentedContextBar({
  breakdown,
  className,
}: {
  breakdown: ThreadContextBreakdown;
  className?: string;
}) {
  const usedRatio = Math.min(1, breakdown.ratio);
  const segments = contextCategoriesForDisplay(breakdown.categories);

  return (
    <div
      className={cn(
        "flex h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      aria-hidden
    >
      <div
        className="flex h-full min-w-0"
        style={{ width: `${usedRatio * 100}%` }}
      >
        {segments.map(({ key, tokens }) => {
          const widthPct =
            breakdown.inputTokens > 0
              ? (tokens / breakdown.inputTokens) * 100
              : 0;
          if (widthPct <= 0) return null;
          return (
            <div
              key={key}
              className={cn("h-full min-w-px", CATEGORY_BAR_CLASS[key])}
              style={{ width: `${widthPct}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ContextUsageRing({
  breakdown,
}: {
  breakdown: ThreadContextBreakdown;
}) {
  const usedRatio = Math.min(1, Math.max(0, breakdown.ratio));
  const length = usedRatio * RING_CIRCUMFERENCE;

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        className="stroke-muted"
        strokeWidth={RING_STROKE}
      />
      {length > 0 ? (
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          className="stroke-muted-foreground"
          strokeWidth={RING_STROKE}
          strokeLinecap="butt"
          strokeDasharray={`${length} ${RING_CIRCUMFERENCE - length}`}
        />
      ) : null}
    </svg>
  );
}

export function ContextUsagePanel({
  breakdown,
  className,
  modelId,
  usageFromCompaction = false,
}: {
  breakdown: ThreadContextBreakdown;
  className?: string;
  modelId?: string | null;
  usageFromCompaction?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const categories = contextCategoriesForDisplay(breakdown.categories, {
    includeZero: true,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
        aria-label={`Context usage ${breakdown.percentFull}% full, ~${formatTokenCount(breakdown.inputTokens)} of ${formatTokenCount(breakdown.contextWindowTokens)} tokens`}
        title={`${breakdown.percentFull}% · ~${formatTokenCount(breakdown.inputTokens)} / ${formatTokenCount(breakdown.contextWindowTokens)}`}
      >
        <ContextUsageRing breakdown={breakdown} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-[min(100vw-2rem,22rem)] gap-3 p-3"
      >
        <PopoverHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="min-w-0 flex-1">
            <PopoverTitle className="text-sm">Context Usage</PopoverTitle>
            <PopoverDescription className="text-xs">
              {usageFromCompaction
                ? "Estimated composition · peak before the last compaction"
                : "Estimated composition · total from last model step"}
              {modelId ? ` · ${modelId}` : null}
            </PopoverDescription>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="size-6 shrink-0 text-muted-foreground"
            aria-label="Close context usage"
            onClick={() => setOpen(false)}
          >
            <XIcon className="size-3.5" />
          </Button>
        </PopoverHeader>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium">{breakdown.percentFull}% Full</span>
          <span className="text-muted-foreground">
            ~{formatTokenCount(breakdown.inputTokens)} /{" "}
            {formatTokenCount(breakdown.contextWindowTokens)} Tokens
          </span>
        </div>

        <SegmentedContextBar breakdown={breakdown} />

        <ul className="flex flex-col gap-1.5">
          {categories.map(({ key, tokens, label }) => (
            <li
              key={key}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-[2px]",
                    CATEGORY_BAR_CLASS[key],
                  )}
                  aria-hidden
                />
                <span className="truncate text-muted-foreground">{label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                {formatTokenCount(tokens)}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
