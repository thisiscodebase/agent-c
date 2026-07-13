"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import type { UsageThreadStat } from "#shared/types/usage-stats";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";

function formatUpdated(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function threadMetricValue(thread: UsageThreadStat, metric: UsageMetric): number {
  switch (metric) {
    case "cost":
      return thread.totalCostUsd;
    case "tokens":
      return thread.totalTokens;
    case "agents":
      return thread.toolCalls;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function formatThreadMetric(thread: UsageThreadStat, metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return formatCostUsd(thread.totalCostUsd);
    case "tokens":
      return formatTokenCount(thread.totalTokens);
    case "agents":
      return `${thread.toolCalls} calls`;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function sortHint(metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return "Sorted by spend — open a chat to inspect activity";
    case "tokens":
      return "Sorted by tokens — open a chat to inspect activity";
    case "agents":
      return "Sorted by tool calls — open a chat to inspect activity";
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

export function AdminThreadList({
  threads,
  metric,
}: {
  threads: UsageThreadStat[];
  metric: UsageMetric;
}) {
  const ranked = useMemo(() => {
    return [...threads].sort(
      (a, b) => threadMetricValue(b, metric) - threadMetricValue(a, metric),
    );
  }, [threads, metric]);

  if (ranked.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Threads</h2>
        <p className="text-sm text-muted-foreground">No threads yet.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Threads</h2>
        <p className="text-xs text-muted-foreground">{sortHint(metric)}</p>
      </div>
      <ol className="flex flex-col gap-1">
        {ranked.map((thread, index) => (
          <li key={thread.threadId}>
            <Link
              className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/70"
              href={`/chat/${thread.threadId}`}
            >
              <span className="mt-0.5 w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{thread.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatUpdated(thread.updatedAt)}
                  {metric !== "agents"
                    ? ` · ${thread.toolCalls} tool calls`
                    : ` · ${formatTokenCount(thread.totalTokens)}`}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                <p>{formatThreadMetric(thread, metric)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
