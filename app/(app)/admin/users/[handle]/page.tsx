"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import { ADMIN_USAGE_METRICS } from "#shared/types/usage-metric";
import { profilePathForHandle } from "#shared/user-handle";
import { AdminThreadList } from "~/components/admin/admin-thread-list";
import { ModelsLeaderboard } from "~/components/profile/models-leaderboard";
import { PopularTools } from "~/components/profile/popular-tools";
import { ProfileActivityHeatmap } from "~/components/profile/profile-activity-heatmap";
import { ProfileUsageChart } from "~/components/profile/profile-usage-charts";
import { UsageMetricSwitcher } from "~/components/profile/usage-metric-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { useAdminAccess, useAdminUserDetail } from "~/hooks/use-admin";
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

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export default function AdminUserPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const access = useAdminAccess();
  const { data, isLoading, error } = useAdminUserDetail(
    handle,
    access.data?.allowed === true,
  );
  const [metric, setMetric] = useState<UsageMetric>("cost");

  if (access.isLoading || (access.data?.allowed && isLoading)) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading user…</p>
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

  if (error || !data?.user) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load user"}
        </p>
      </div>
    );
  }

  const user = data.user;
  const { stats } = user;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 md:px-10">
        <div>
          <Button
            className="mb-4 -ml-2 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/admin" />}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon />
            Admin dashboard
          </Button>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage alt={user.name} src={user.image ?? undefined} />
                <AvatarFallback className="text-lg">{userInitial(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {user.name}
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  @{user.handle} · {user.email}
                </p>
              </div>
            </div>
            <Button
              nativeButton={false}
              render={<Link href={profilePathForHandle(user.handle)} />}
              variant="outline"
            >
              Public profile
            </Button>
          </header>
        </div>

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

        <AdminThreadList metric={metric} threads={user.threads} />

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
