"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import type { UsageThreadFlag, UsageThreadStat } from "#shared/types/usage-stats";
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
      return thread.categoryCostUsd ?? thread.totalCostUsd;
    case "tokens":
      return thread.categoryTokens ?? thread.totalTokens;
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
      return formatCostUsd(thread.categoryCostUsd ?? thread.totalCostUsd);
    case "tokens":
      return formatTokenCount(thread.categoryTokens ?? thread.totalTokens);
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

function flagLabel(flag: UsageThreadFlag): string {
  switch (flag) {
    case "high_steps":
      return "High steps";
    case "connector_spray":
      return "Connector spray";
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

function threadActivityLine(thread: UsageThreadStat): string {
  const turns = thread.turnCount ?? 0;
  const steps = thread.stepCount ?? 0;
  const tools = thread.toolCalls ?? 0;
  return `${turns} turn${turns === 1 ? "" : "s"} · ${steps} step${steps === 1 ? "" : "s"} · ${tools} tool${tools === 1 ? "" : "s"}`;
}

export function AdminThreadList({
  threads,
  metric,
  /** When set, primary metric prefers category-attributed cost/tokens. */
  categoryAttributed = false,
}: {
  threads: UsageThreadStat[];
  metric: UsageMetric;
  categoryAttributed?: boolean;
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
        <p className="text-xs text-muted-foreground">
          {categoryAttributed
            ? "Sorted by cost attributed to this tool — open a chat to inspect"
            : sortHint(metric)}
        </p>
      </div>
      <ol className="flex flex-col gap-1">
        {ranked.map((thread, index) => {
          const categories = (thread.topCategories ?? [])
            .map((c) => c.label)
            .join(" · ");
          const flags = thread.flags ?? [];

          return (
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
                    {formatUpdated(thread.updatedAt)} · {threadActivityLine(thread)}
                  </p>
                  {categories ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                      {categories}
                    </p>
                  ) : null}
                  {flags.length > 0 ? (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {flags.map((flag) => (
                        <span
                          key={flag}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {flagLabel(flag)}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  <p>{formatThreadMetric(thread, metric)}</p>
                  {metric === "cost" ? (
                    <p className="text-xs">
                      {formatTokenCount(thread.categoryTokens ?? thread.totalTokens)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
