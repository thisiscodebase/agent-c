"use client";

import { LinkIcon } from "lucide-react";
import { useState } from "react";
import { ModelProviderLogo } from "~/components/profile/model-provider-logo";
import { ProfileActivityHeatmap } from "~/components/profile/profile-activity-heatmap";
import {
  ProfileAgentsChart,
  ProfileTokensChart,
} from "~/components/profile/profile-usage-charts";
import { TokenLeaderboard } from "~/components/profile/token-leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { useCompanyProfile } from "~/hooks/use-company-profile";
import {
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

export default function LeaderboardPage() {
  const { data, isLoading, error } = useCompanyProfile();
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
      </div>
    );
  }

  if (error || !data?.company) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load leaderboard"}
        </p>
      </div>
    );
  }

  const company = data.company;
  const { stats } = company;

  async function shareLeaderboard() {
    const url = `${window.location.origin}/leaderboard`;
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
                alt={company.name}
                className="rounded-xl object-cover"
                src="/icons/codebase.jpeg"
              />
              <AvatarFallback className="rounded-xl text-lg">C</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {company.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {company.userCount} {company.userCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void shareLeaderboard()}>
            <LinkIcon />
            {copied ? "Copied" : "Share"}
          </Button>
        </header>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Metric label="Agents" value={String(stats.agentCount)} />
          <Metric label="Tokens" value={formatTokenCount(stats.totalTokens)} />
          <Metric label="Longest Agent" value={formatDurationMs(stats.longestAgentMs)} />
          <Metric label="Longest Streak" value={`${stats.longestStreakDays}d`} />
        </div>

        <ProfileActivityHeatmap data={stats.heatmap} />

        <TokenLeaderboard entries={company.leaderboard} />

        {stats.models.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Models</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {stats.models.map((model, index) => (
                <div
                  key={model.modelId}
                  className="relative flex items-center gap-3 rounded-xl bg-muted/70 px-4 py-3"
                >
                  <ModelProviderLogo label={model.label} modelId={model.modelId} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{model.label}</p>
                  </div>
                  <span className="absolute top-2 right-3 text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <ProfileTokensChart daily={stats.daily} totalTokens={stats.totalTokens} />
        <ProfileAgentsChart agentCount={stats.agentCount} daily={stats.daily} />
      </div>
    </div>
  );
}
