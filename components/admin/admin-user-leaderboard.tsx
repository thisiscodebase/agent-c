"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import type { AdminLeaderboardEntry } from "#shared/types/usage-stats";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";
import { splitRankedColumns } from "~/lib/ranked-columns";

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function sortEntries(
  entries: AdminLeaderboardEntry[],
  metric: UsageMetric,
): AdminLeaderboardEntry[] {
  const active = entries.filter(
    (entry) => entry.agentCount > 0 || entry.totalTokens > 0 || entry.totalCostUsd > 0,
  );

  const sorted = [...active].sort((a, b) => {
    switch (metric) {
      case "cost":
        return b.totalCostUsd - a.totalCostUsd || b.totalTokens - a.totalTokens;
      case "tokens":
        return b.totalTokens - a.totalTokens || b.totalCostUsd - a.totalCostUsd;
      case "agents":
        return b.agentCount - a.agentCount || b.totalCostUsd - a.totalCostUsd;
      default: {
        const _exhaustive: never = metric;
        return _exhaustive;
      }
    }
  });

  return sorted.slice(0, 10).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function metricValue(entry: AdminLeaderboardEntry, metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return formatCostUsd(entry.totalCostUsd);
    case "tokens":
      return formatTokenCount(entry.totalTokens);
    case "agents":
      return String(entry.agentCount);
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function AdminLeaderboardRow({
  entry,
  metric,
}: {
  entry: AdminLeaderboardEntry;
  metric: UsageMetric;
}) {
  return (
    <li>
      <Link
        className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
        href={`/admin/users/${encodeURIComponent(entry.handle)}`}
      >
        <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
          {entry.rank}
        </span>
        <Avatar size="sm">
          <AvatarImage alt={entry.name} src={entry.image ?? undefined} />
          <AvatarFallback>{userInitial(entry.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {entry.name}
        </span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {metricValue(entry, metric)}
        </span>
      </Link>
    </li>
  );
}

export function AdminUserLeaderboard({
  entries,
  metric,
}: {
  entries: AdminLeaderboardEntry[];
  metric: UsageMetric;
}) {
  const ranked = useMemo(() => sortEntries(entries, metric), [entries, metric]);
  const { left, right } = splitRankedColumns(ranked);

  if (ranked.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Users</h2>
        <p className="text-sm text-muted-foreground">No usage yet.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Users</h2>
        <p className="text-xs text-muted-foreground">Open a user to inspect threads</p>
      </div>
      <div className="w-full min-w-0 overflow-hidden rounded-xl bg-card p-1 ring-1 ring-foreground/10">
        <div className="grid sm:grid-cols-2 sm:gap-x-1">
          <ol className="flex flex-col">
            {left.map((entry) => (
              <AdminLeaderboardRow key={entry.handle} entry={entry} metric={metric} />
            ))}
          </ol>
          {right.length > 0 ? (
            <ol className="flex flex-col">
              {right.map((entry) => (
                <AdminLeaderboardRow key={entry.handle} entry={entry} metric={metric} />
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}
