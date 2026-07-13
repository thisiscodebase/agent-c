"use client";

import { LinkIcon, PencilIcon } from "lucide-react";
import { use, useState } from "react";
import { profilePathForHandle } from "#shared/user-handle";
import { ModelProviderLogo } from "~/components/profile/model-provider-logo";
import { ProfileActivityHeatmap } from "~/components/profile/profile-activity-heatmap";
import { ProfileEditDialog } from "~/components/profile/profile-edit-dialog";
import {
  ProfileAgentsChart,
  ProfileTokensChart,
} from "~/components/profile/profile-usage-charts";
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
