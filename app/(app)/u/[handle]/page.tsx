"use client";

import { LinkIcon, PencilIcon } from "lucide-react";
import { use, useState } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import { PUBLIC_USAGE_METRICS } from "#shared/types/usage-metric";
import { profilePathForHandle } from "#shared/user-handle";
import { ModelsLeaderboard } from "~/components/profile/models-leaderboard";
import { PopularTools } from "~/components/profile/popular-tools";
import { ProfileActivityHeatmap } from "~/components/profile/profile-activity-heatmap";
import { ProfileEditDialog } from "~/components/profile/profile-edit-dialog";
import { ProfileUsageChart } from "~/components/profile/profile-usage-charts";
import { UsageMetricSwitcher } from "~/components/profile/usage-metric-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { usePublicProfile } from "~/hooks/use-public-profile";
import {
  formatDurationMs,
  formatJoinedDaysAgo,
  formatTokenCount,
} from "~/lib/format-usage";

function userInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: rawHandle } = use(params);
  const handle = decodeURIComponent(rawHandle);
  const { data, isLoading, error } = usePublicProfile(handle);
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [metric, setMetric] = useState<Exclude<UsageMetric, "cost">>("agents");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "User not found"}
        </p>
      </div>
    );
  }

  const profile = data.profile;
  const { stats } = profile;

  async function shareProfile() {
    const url = `${window.location.origin}${profilePathForHandle(handle)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 md:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-12 rounded-xl after:rounded-xl data-[size=default]:size-12">
              <AvatarImage
                alt={profile.name}
                className="rounded-xl"
                src={profile.image ?? undefined}
              />
              <AvatarFallback className="rounded-xl text-lg">
                {userInitial(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {profile.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatJoinedDaysAgo(profile.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void shareProfile()}>
              <LinkIcon />
              {copied ? "Copied" : "Share"}
            </Button>
            {profile.isOwn ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <PencilIcon />
                Edit
              </Button>
            ) : null}
          </div>
        </header>

        {profile.bio ? (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{profile.bio}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Metric label="Agents" value={String(stats.agentCount)} />
          <Metric label="Tokens" value={formatTokenCount(stats.totalTokens)} />
          <Metric label="Longest Agent" value={formatDurationMs(stats.longestAgentMs)} />
          <Metric label="Longest Streak" value={`${stats.longestStreakDays}d`} />
        </div>

        <ProfileActivityHeatmap data={stats.heatmap} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sort & chart by</p>
          <UsageMetricSwitcher
            options={PUBLIC_USAGE_METRICS}
            value={metric}
            onChange={(next) => {
              if (next !== "cost") {
                setMetric(next);
              }
            }}
          />
        </div>

        <PopularTools metric={metric} tools={stats.tools} />

        <ModelsLeaderboard metric={metric} models={stats.models} />

        <ProfileUsageChart
          agentCount={stats.agentCount}
          daily={stats.daily}
          metric={metric}
          totalTokens={stats.totalTokens}
        />
      </div>

      {profile.isOwn ? (
        <ProfileEditDialog
          handle={handle}
          initialBio={profile.bio}
          initialName={profile.name}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  );
}
