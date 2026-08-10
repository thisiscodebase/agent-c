"use client";

import type { UsageMeterSnapshot } from "#shared/types/usage-meter";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";

function resetsLabel(resetsAt: number): string {
  const date = new Date(resetsAt);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function UsageMeterCard({
  meter,
  className,
}: {
  meter: UsageMeterSnapshot;
  className?: string;
}) {
  const percentLabel = `${Math.round(meter.percent)}% used`;
  const indicatorClass =
    meter.status === "blocked"
      ? "[&_[data-slot=progress-indicator]]:bg-foreground"
      : meter.status === "warn"
        ? "[&_[data-slot=progress-indicator]]:bg-amber-600 dark:[&_[data-slot=progress-indicator]]:bg-amber-500"
        : "[&_[data-slot=progress-indicator]]:bg-blue-600 dark:[&_[data-slot=progress-indicator]]:bg-blue-500";

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="flex w-full items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm text-foreground">Monthly Usage</p>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {percentLabel}
        </p>
      </div>

      <Progress
        value={meter.percent}
        className={cn(
          "mt-3 w-full gap-0 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-muted",
          indicatorClass,
        )}
      />

      <p className="mt-3 text-xs text-muted-foreground">
        Resets {resetsLabel(meter.resetsAt)} (UTC)
      </p>
    </div>
  );
}
