import type { ThreadSummary } from "#shared/types/thread";
import { THREAD_LIST_KEY, deleteThread, refreshThreadList } from "~/composables/chat/navigation";

interface ThreadListResponse {
  threads: ThreadSummary[];
}

export function useThreadList() {
  const { data, pending, refresh, error } = useFetch<ThreadListResponse>("/api/threads", {
    key: THREAD_LIST_KEY,
    ...payloadCacheOptions,
  });

  const threads = computed(() => data.value?.threads ?? []);

  return {
    threads,
    pending,
    error,
    refresh,
    refreshThreadList,
    deleteThread,
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
