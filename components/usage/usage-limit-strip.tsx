"use client";

import type { UsageMeterStatus } from "#shared/usage-meter";
import { cn } from "~/lib/utils";

export function UsageLimitStrip({
  status,
  className,
}: {
  status: Extract<UsageMeterStatus, "warn" | "blocked">;
  className?: string;
}) {
  const message =
    status === "blocked"
      ? "Monthly usage limit reached. New messages are paused until next month, or ask an admin to raise your cap."
      : "You're almost at this month's usage limit. This message can still send and finish; further turns may pause afterward.";

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 text-xs leading-relaxed",
        status === "blocked"
          ? "bg-muted text-foreground"
          : "bg-amber-500/10 text-amber-950 dark:text-amber-100",
        className,
      )}
      role="status"
    >
      {message}
    </div>
  );
}
