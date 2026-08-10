"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { UsageMeterSettings } from "#shared/types/usage-meter";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { queryKeys } from "~/lib/query-keys";

export function AdminUsageSettings({
  initialSettings,
}: {
  initialSettings: UsageMeterSettings;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(String(initialSettings.defaultLimitUsd));
  const [settings, setSettings] = useState(initialSettings);

  const mutation = useMutation({
    mutationFn: async (defaultLimitUsd: number) => {
      const res = await fetch("/api/admin/usage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLimitUsd }),
      });
      if (!res.ok) {
        throw new Error("Failed to update company default limit");
      }
      return res.json() as Promise<{ settings: UsageMeterSettings }>;
    },
    onSuccess: (data) => {
      setSettings(data.settings);
      setDraft(String(data.settings.defaultLimitUsd));
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsageMeters });
    },
  });

  return (
    <div className="flex flex-col gap-2 rounded-xl border px-4 py-3">
      <p className="text-sm font-medium">Company default monthly cap (USD)</p>
      <p className="text-xs text-muted-foreground">
        Applies to everyone without a personal override. Change takes effect
        immediately — no redeploy.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-[10rem]"
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button
          disabled={mutation.isPending}
          type="button"
          onClick={() => {
            const value = Number(draft.trim());
            if (!Number.isFinite(value) || value <= 0) {
              return;
            }
            mutation.mutate(value);
          }}
        >
          Save default
        </Button>
        <span className="text-xs text-muted-foreground">
          Current: ${settings.defaultLimitUsd}
        </span>
      </div>
      {mutation.isError ? (
        <p className="text-xs text-destructive">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Failed to update"}
        </p>
      ) : null}
    </div>
  );
}
