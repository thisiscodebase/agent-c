"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { UsageThreadFlag, UsageThreadStat } from "#shared/types/usage-stats";
import { isSlackThreadId } from "#shared/types/thread";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";

type ThreadSort = "recent" | "cost";

function formatUpdated(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function threadCost(thread: UsageThreadStat, categoryAttributed: boolean): number {
  return categoryAttributed
    ? (thread.categoryCostUsd ?? thread.totalCostUsd)
    : thread.totalCostUsd;
}

function threadTokens(thread: UsageThreadStat, categoryAttributed: boolean): number {
  return categoryAttributed
    ? (thread.categoryTokens ?? thread.totalTokens)
    : thread.totalTokens;
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

function isSlackThread(thread: UsageThreadStat): boolean {
  return thread.source === "slack" || isSlackThreadId(thread.threadId);
}

function sortHint(sort: ThreadSort, categoryAttributed: boolean): string {
  if (sort === "recent") {
    return "Sorted by most recent — open a web chat to inspect, or review Slack rows here";
  }
  return categoryAttributed
    ? "Sorted by cost attributed to this tool — open a web chat to inspect"
    : "Sorted by spend — open a web chat to inspect activity";
}

export function AdminThreadList({
  threads,
  /** When set, cost/tokens prefer category-attributed values. */
  categoryAttributed = false,
}: {
  threads: UsageThreadStat[];
  categoryAttributed?: boolean;
}) {
  const [sort, setSort] = useState<ThreadSort>("recent");

  const ranked = useMemo(() => {
    return [...threads].sort((a, b) => {
      if (sort === "recent") {
        return b.updatedAt - a.updatedAt;
      }
      return threadCost(b, categoryAttributed) - threadCost(a, categoryAttributed);
    });
  }, [threads, sort, categoryAttributed]);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Threads</h2>
          <p className="text-xs text-muted-foreground">
            {sortHint(sort, categoryAttributed)}
          </p>
        </div>
        <Tabs
          value={sort}
          onValueChange={(next) => {
            if (next === "recent" || next === "cost") {
              setSort(next);
            }
          }}
        >
          <TabsList className="bg-muted-foreground/15 dark:bg-muted-foreground/25">
            <TabsTrigger
              className="data-active:bg-white data-active:text-foreground data-active:shadow-sm dark:data-active:bg-background dark:data-active:text-foreground"
              value="recent"
            >
              Recent
            </TabsTrigger>
            <TabsTrigger
              className="data-active:bg-white data-active:text-foreground data-active:shadow-sm dark:data-active:bg-background dark:data-active:text-foreground"
              value="cost"
            >
              Cost
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ol className="flex flex-col gap-2">
        {ranked.map((thread, index) => {
          const flags = thread.flags ?? [];
          const slack = isSlackThread(thread);
          const rowClassName =
            "flex w-full min-w-0 items-start gap-3 rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10";

          const body = (
            <>
              <span className="mt-0.5 w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <span className="truncate">{thread.title}</span>
                  {slack ? (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Slack
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatUpdated(thread.updatedAt)} · {threadActivityLine(thread)}
                </p>
                {flags.length > 0 ? (
                  <p className="mt-2 flex flex-wrap gap-1">
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
                <p>{formatCostUsd(threadCost(thread, categoryAttributed))}</p>
                <p className="text-xs">
                  {formatTokenCount(threadTokens(thread, categoryAttributed))}
                </p>
              </div>
            </>
          );

          return (
            <li key={thread.threadId}>
              {slack ? (
                <div className={rowClassName}>{body}</div>
              ) : (
                <Link
                  className={`${rowClassName} transition-colors hover:bg-muted/40`}
                  href={`/chat/${thread.threadId}`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
