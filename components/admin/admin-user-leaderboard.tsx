"use client";

import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import type { AdminUsageMeterRow } from "#shared/types/usage-meter";
import type { UsageMeterStatus } from "#shared/usage-meter";
import type { AdminLeaderboardEntry } from "#shared/types/usage-stats";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";
import { cn } from "~/lib/utils";

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function compareEntries(
  a: AdminLeaderboardEntry,
  b: AdminLeaderboardEntry,
  metric: UsageMetric,
): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  switch (metric) {
    case "cost":
      return b.totalCostUsd - a.totalCostUsd || b.totalTokens - a.totalTokens || byName;
    case "tokens":
      return b.totalTokens - a.totalTokens || b.totalCostUsd - a.totalCostUsd || byName;
    case "agents":
      return b.agentCount - a.agentCount || b.totalCostUsd - a.totalCostUsd || byName;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function rankEntries(
  entries: AdminLeaderboardEntry[],
  metric: UsageMetric,
): AdminLeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => compareEntries(a, b, metric))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function matchesStaffQuery(entry: AdminLeaderboardEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    entry.name.toLowerCase().includes(needle) ||
    entry.handle.toLowerCase().includes(needle)
  );
}

function meterStatusClass(status: UsageMeterStatus): string {
  switch (status) {
    case "blocked":
      return "font-medium text-foreground";
    case "warn":
      return "text-amber-700 dark:text-amber-400";
    case "ok":
      return "text-muted-foreground";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function meterLine(meter: AdminUsageMeterRow): string {
  const custom = meter.limitOverrideUsd != null ? " · custom cap" : "";
  return `${formatCostUsd(meter.usedUsd)} / ${formatCostUsd(meter.limitUsd)} this month${custom} · ${Math.round(meter.percent)}%`;
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
  meter,
  showHandle,
}: {
  entry: AdminLeaderboardEntry;
  metric: UsageMetric;
  meter: AdminUsageMeterRow | undefined;
  showHandle: boolean;
}) {
  const detail = [
    showHandle ? `@${entry.handle}` : null,
    meter ? meterLine(meter) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <li>
      <Link
        className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
        href={`/admin/users/${encodeURIComponent(entry.handle)}`}
        title={`${entry.name} (@${entry.handle})`}
      >
        <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
          {entry.rank}
        </span>
        <Avatar size="sm">
          <AvatarImage alt="" src={entry.image ?? undefined} />
          <AvatarFallback>{userInitial(entry.name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">{entry.name}</span>
          {detail ? (
            <span
              className={cn(
                "block truncate text-xs",
                meter ? meterStatusClass(meter.status) : "text-muted-foreground",
              )}
            >
              {detail}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {metricValue(entry, metric)}
        </span>
      </Link>
    </li>
  );
}

function StaffRows({
  entries,
  metric,
  metersByHandle,
  showHandle,
}: {
  entries: AdminLeaderboardEntry[];
  metric: UsageMetric;
  metersByHandle: Map<string, AdminUsageMeterRow>;
  showHandle: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry) => (
        <AdminLeaderboardRow
          key={entry.handle}
          entry={entry}
          meter={metersByHandle.get(entry.handle)}
          metric={metric}
          showHandle={showHandle}
        />
      ))}
    </ol>
  );
}

export function AdminUserLeaderboard({
  entries,
  metric,
  meters = [],
  budget,
}: {
  entries: AdminLeaderboardEntry[];
  metric: UsageMetric;
  meters?: AdminUsageMeterRow[];
  budget?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const metersByHandle = useMemo(() => {
    const map = new Map<string, AdminUsageMeterRow>();
    for (const meter of meters) {
      map.set(meter.handle, meter);
    }
    return map;
  }, [meters]);
  const ranked = useMemo(() => rankEntries(entries, metric), [entries, metric]);
  const visible = useMemo(
    () => ranked.filter((entry) => matchesStaffQuery(entry, query)),
    [ranked, query],
  );
  const searching = query.trim().length > 0;

  if (entries.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Users</h2>
        <p className="text-sm text-muted-foreground">No members yet.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Users</h2>
          <p className="text-xs text-muted-foreground">
            {searching
              ? `${visible.length} of ${ranked.length} members`
              : `${ranked.length} ${ranked.length === 1 ? "member" : "members"} · lifetime total, with this month’s cap`}
          </p>
        </div>
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search staff by name or handle"
            placeholder="Search by name or handle"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {searching ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Clear search"
                size="icon-xs"
                onClick={() => setQuery("")}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>
      {budget}
      <div className="w-full min-w-0 overflow-hidden rounded-xl bg-card p-1 ring-1 ring-foreground/10">
        {visible.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No members match “{query.trim()}”.
          </p>
        ) : (
          <div className={visible.length > 8 ? "max-h-[28rem] overflow-y-auto" : undefined}>
            <StaffRows
              entries={visible}
              metersByHandle={metersByHandle}
              metric={metric}
              showHandle={searching}
            />
          </div>
        )}
      </div>
    </section>
  );
}
