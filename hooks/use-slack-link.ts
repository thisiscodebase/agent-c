"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SlackLinkSummary } from "#shared/types/slack-link";
import { queryKeys } from "~/lib/query-keys";

export function useSlackLink() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.slackLink,
    queryFn: () => fetch("/api/slack/link").then((r) => r.json() as Promise<SlackLinkSummary>),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.slackLink });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/slack/link/code", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate link code");
    },
    onSuccess: invalidate,
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/slack/link", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unlink Slack");
    },
    onSuccess: invalidate,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    isLinked: query.data?.linked === true,
    pendingCode: query.data?.pendingCode,
    generating: generateMutation.isPending,
    generateLinkCode: () => generateMutation.mutateAsync(),
    generateError: generateMutation.error,
    unlinkSlack: () => unlinkMutation.mutateAsync(),
  };
}
