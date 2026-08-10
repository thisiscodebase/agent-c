"use client";

import Link from "next/link";
import type { AdminUsageMeterRow, UsageMeterSettings } from "#shared/types/usage-meter";
import { AdminUsageSettings } from "~/components/admin/admin-usage-settings";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatCostUsd } from "~/lib/format-usage";
import { cn } from "~/lib/utils";

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export function AdminUsageMeters({
  meters,
  settings,
}: {
  meters: AdminUsageMeterRow[];
  settings: UsageMeterSettings;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-medium">Monthly soft limits</h2>
        <p className="text-xs text-muted-foreground">
          Configure the company default, then raise or reset individuals from
          their admin page
        </p>
      </div>

      <AdminUsageSettings
        key={settings.defaultLimitUsd}
        initialSettings={settings}
      />

      {meters.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team usage yet this month.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border">
          {meters.map((row) => (
            <li key={row.userId}>
              <Link
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/70"
                href={`/admin/users/${encodeURIComponent(row.handle)}`}
              >
                <Avatar size="sm">
                  <AvatarImage alt={row.name} src={row.image ?? undefined} />
                  <AvatarFallback>{userInitial(row.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatCostUsd(row.usedUsd)} / {formatCostUsd(row.limitUsd)}
                    {row.limitOverrideUsd != null ? " · custom cap" : null}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm tabular-nums",
                    row.status === "blocked"
                      ? "font-medium text-foreground"
                      : row.status === "warn"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground",
                  )}
                >
                  {Math.round(row.percent)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
