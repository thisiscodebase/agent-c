"use client";

import { useQuery } from "@tanstack/react-query";
import type { ThreadSummary } from "#shared/types/thread";
import { queryKeys } from "~/lib/query-keys";

interface ThreadListResponse {
  threads: ThreadSummary[];
}

export function useThreadList() {
  const query = useQuery({
    queryKey: queryKeys.threads,
    queryFn: () => fetch("/api/threads").then((r) => r.json() as Promise<ThreadListResponse>),
  });

  return {
    threads: query.data?.threads ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

export function formatThreadTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) {
    return "1m";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${days}d`;
}
