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

const THREAD_TIME = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

export function formatThreadTime(timestamp: number) {
  return THREAD_TIME.format(new Date(timestamp));
}
