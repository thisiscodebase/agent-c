"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeaderboardEntry } from "#shared/types/usage-stats";
import { profilePathForHandle } from "#shared/user-handle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatTokenCount } from "~/lib/format-usage";

const LEADERBOARD_LIMIT = 10;

type SortKey = "agents" | "tokens";

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function sortEntries(entries: LeaderboardEntry[], sort: SortKey): LeaderboardEntry[] {
  const active = entries.filter(
    (entry) => entry.agentCount > 0 || entry.totalTokens > 0,
  );

  const sorted = [...active].sort((a, b) => {
    if (sort === "agents") {
      return b.agentCount - a.agentCount || b.totalTokens - a.totalTokens;
    }
    return b.totalTokens - a.totalTokens || b.agentCount - a.agentCount;
  });

  return sorted.slice(0, LEADERBOARD_LIMIT).map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export function TokenLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const [sort, setSort] = useState<SortKey>("agents");
  const ranked = useMemo(() => sortEntries(entries, sort), [entries, sort]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Leaderboard</h2>
        <Tabs
          value={sort}
          onValueChange={(value) => {
            if (value === "agents" || value === "tokens") {
              setSort(value);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ol className="flex flex-col gap-1">
        {ranked.map((entry) => (
          <li key={entry.handle}>
            <Link
              className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70"
              href={profilePathForHandle(entry.handle)}
            >
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                {entry.rank}
              </span>
              <Avatar size="sm">
                <AvatarImage alt={entry.name} src={entry.image ?? undefined} />
                <AvatarFallback>{userInitial(entry.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {entry.name}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {sort === "agents"
                  ? entry.agentCount
                  : formatTokenCount(entry.totalTokens)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
