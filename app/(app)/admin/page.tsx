"use client";

import Link from "next/link";
import { useState } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import { ADMIN_USAGE_METRICS } from "#shared/types/usage-metric";
import { AdminUserLeaderboard } from "~/components/admin/admin-user-leaderboard";
import { ModelsLeaderboard } from "~/components/profile/models-leaderboard";
import { PopularTools } from "~/components/profile/popular-tools";
import { ProfileActivityHeatmap } from "~/components/profile/profile-activity-heatmap";
import { ProfileUsageChart } from "~/components/profile/profile-usage-charts";
import { UsageMetricSwitcher } from "~/components/profile/usage-metric-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { useAdminAccess, useAdminCompanyProfile } from "~/hooks/use-admin";
import {
  formatCostUsd,
  formatDurationMs,
  formatTokenCount,
} from "~/lib/format-usage";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const access = useAdminAccess();
  const { data, isLoading, error } = useAdminCompanyProfile(access.data?.allowed === true);
  const [metric, setMetric] = useState<UsageMetric>("cost");

  if (access.isLoading || (access.data?.allowed && isLoading)) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading admin dashboard…</p>
      </div>
    );
  }

  if (access.data && !access.data.allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-muted-foreground">Admin access required.</p>
        <Button nativeButton={false} render={<Link href="/leaderboard" />} variant="outline">
          Back to leaderboard
        </Button>
      </div>
    );
  }

  if (error || !data?.company) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load admin dashboard"}
        </p>
      </div>
    );
  }

  const company = data.company;
  const { stats } = company;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-12 rounded-xl after:rounded-xl data-[size=default]:size-12">
              <AvatarImage
                alt={company.name}
                className="rounded-xl object-cover"
                src="/icons/codebase.jpeg"
              />
              <AvatarFallback className="rounded-xl text-lg">C</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                Admin · {company.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Internal usage & cost · {company.userCount}{" "}
                {company.userCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          <Button nativeButton={false} render={<Link href="/leaderboard" />} variant="outline">
            Public leaderboard
          </Button>
        </header>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Metric label="Cost" value={formatCostUsd(stats.totalCostUsd)} />
          <Metric label="Tokens" value={formatTokenCount(stats.totalTokens)} />
          <Metric label="Agents" value={String(stats.agentCount)} />
          <Metric label="Longest Agent" value={formatDurationMs(stats.longestAgentMs)} />
        </div>

        <ProfileActivityHeatmap data={stats.heatmap} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sort & chart by</p>
          <UsageMetricSwitcher
            options={ADMIN_USAGE_METRICS}
            value={metric}
            onChange={setMetric}
          />
        </div>

        <AdminUserLeaderboard entries={company.leaderboard} metric={metric} />

        <PopularTools metric={metric} tools={stats.tools} />

        <ModelsLeaderboard metric={metric} models={stats.models} />

        <ProfileUsageChart
          agentCount={stats.agentCount}
          daily={stats.daily}
          metric={metric}
          totalCostUsd={stats.totalCostUsd}
          totalTokens={stats.totalTokens}
        />
      </div>
    </div>
  );
}
