"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import type { LeaderboardEntry } from "#shared/types/usage-stats";
import { profilePathForHandle } from "#shared/user-handle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatTokenCount } from "~/lib/format-usage";
import { splitRankedColumns } from "~/lib/ranked-columns";

const LEADERBOARD_LIMIT = 10;

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function sortEntries(
  entries: LeaderboardEntry[],
  metric: Exclude<UsageMetric, "cost">,
): LeaderboardEntry[] {
  const active = entries.filter(
    (entry) => entry.agentCount > 0 || entry.totalTokens > 0,
  );

  const sorted = [...active].sort((a, b) => {
    if (metric === "agents") {
      return b.agentCount - a.agentCount || b.totalTokens - a.totalTokens;
    }
    return b.totalTokens - a.totalTokens || b.agentCount - a.agentCount;
  });

  return sorted.slice(0, LEADERBOARD_LIMIT).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function metricValue(entry: LeaderboardEntry, metric: Exclude<UsageMetric, "cost">): string {
  return metric === "agents"
    ? String(entry.agentCount)
    : formatTokenCount(entry.totalTokens);
}

function LeaderboardRow({
  entry,
  metric,
}: {
  entry: LeaderboardEntry;
  metric: Exclude<UsageMetric, "cost">;
}) {
  return (
    <li>
      <Link
        className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
        href={profilePathForHandle(entry.handle)}
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

export function TokenLeaderboard({
  entries,
  metric,
}: {
  entries: LeaderboardEntry[];
  metric: Exclude<UsageMetric, "cost">;
}) {
  const ranked = useMemo(() => sortEntries(entries, metric), [entries, metric]);
  const { left, right } = splitRankedColumns(ranked);

  if (ranked.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Leaderboard</h2>
        <p className="text-sm text-muted-foreground">No usage yet.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Leaderboard</h2>
      <div className="w-full min-w-0 overflow-hidden rounded-xl bg-card p-1 ring-1 ring-foreground/10">
        <div className="grid sm:grid-cols-2 sm:gap-x-1">
          <ol className="flex flex-col">
            {left.map((entry) => (
              <LeaderboardRow key={entry.handle} entry={entry} metric={metric} />
            ))}
          </ol>
          {right.length > 0 ? (
            <ol className="flex flex-col">
              {right.map((entry) => (
                <LeaderboardRow key={entry.handle} entry={entry} metric={metric} />
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}
