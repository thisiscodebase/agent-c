"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { UsageMeterSnapshot } from "#shared/types/usage-meter";
import { UsageMeterCard } from "~/components/usage/usage-meter-card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatCostUsd } from "~/lib/format-usage";
import { queryKeys } from "~/lib/query-keys";

export function AdminUsageLimitEditor({
  handle,
  initialMeter,
}: {
  handle: string;
  initialMeter: UsageMeterSnapshot;
}) {
  const queryClient = useQueryClient();
  const [meter, setMeter] = useState(initialMeter);
  const [draft, setDraft] = useState(
    initialMeter.limitOverrideUsd != null
      ? String(initialMeter.limitOverrideUsd)
      : "",
  );

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(handle) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsageMeters });
    void queryClient.invalidateQueries({ queryKey: queryKeys.usageMeter });
  }

  const limitMutation = useMutation({
    mutationFn: async (limitUsd: number | null) => {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(handle)}/usage-limit`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limitUsd }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to update usage limit");
      }
      return res.json() as Promise<{ meter: UsageMeterSnapshot }>;
    },
    onSuccess: (data) => {
      setMeter(data.meter);
      setDraft(
        data.meter.limitOverrideUsd != null
          ? String(data.meter.limitOverrideUsd)
          : "",
      );
      invalidate();
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(handle)}/usage-reset`,
        { method: "POST" },
      );
      if (!res.ok) {
        throw new Error("Failed to reset usage");
      }
      return res.json() as Promise<{ meter: UsageMeterSnapshot }>;
    },
    onSuccess: (data) => {
      setMeter(data.meter);
      invalidate();
    },
  });

  const busy = limitMutation.isPending || resetMutation.isPending;
  const error = limitMutation.error ?? resetMutation.error;

  return (
    <section className="flex flex-col gap-4">
      <UsageMeterCard meter={meter} />

      <div className="w-full min-w-0 rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10">
        <div className="flex w-full items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm text-foreground">User Limit</p>
          <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatCostUsd(meter.usedUsd)} used
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            className="max-w-[10rem]"
            inputMode="decimal"
            placeholder={String(meter.defaultLimitUsd)}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            disabled={busy}
            type="button"
            onClick={() => {
              const trimmed = draft.trim();
              if (!trimmed) {
                limitMutation.mutate(null);
                return;
              }
              const value = Number(trimmed);
              if (!Number.isFinite(value) || value <= 0) {
                return;
              }
              limitMutation.mutate(value);
            }}
          >
            Save
          </Button>
          <Button
            disabled={busy || meter.limitOverrideUsd == null}
            type="button"
            variant="outline"
            onClick={() => limitMutation.mutate(null)}
          >
           Default
          </Button>
          <Button
            disabled={busy || meter.usedUsd <= 0}
            type="button"
            variant="outline"
            onClick={() => {
              if (
                !window.confirm(
                  `Reset ${handle}'s usage for ${meter.periodKey} to $0?`,
                )
              ) {
                return;
              }
              resetMutation.mutate();
            }}
          >
            Reset usage
          </Button>
        </div>

        {error ? (
          <p className="mt-3 text-xs text-destructive">
            {error instanceof Error ? error.message : "Failed to update"}
          </p>
        ) : null}
      </div>
    </section>
  );
}
