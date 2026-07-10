import type { QueryClient } from "@tanstack/react-query";
import type { ThreadRecord, ThreadSummary } from "#shared/types/thread";
import { queryKeys } from "~/lib/query-keys";

interface ThreadListResponse {
  threads: ThreadSummary[];
}

interface GenerateTitleResponse {
  thread?: ThreadRecord;
  skipped?: boolean;
}

export type GenerateTitleRequest =
  | { mode: "seed"; seedText: string; force?: boolean }
  | { mode: "refine"; force?: boolean };

function upsertThreadInList(
  queryClient: QueryClient,
  thread: ThreadRecord,
) {
  queryClient.setQueryData<ThreadListResponse>(queryKeys.threads, (old) => {
    const others = (old?.threads ?? []).filter((entry) => entry.id !== thread.id);
    return {
      threads: [
        {
          id: thread.id,
          title: thread.title,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        },
        ...others,
      ].sort((a, b) => b.updatedAt - a.updatedAt),
    };
  });
}

export async function requestThreadTitleGeneration(
  threadId: string,
  body: GenerateTitleRequest,
  queryClient: QueryClient,
) {
  try {
    const response = await fetch(`/api/threads/${threadId}/generate-title`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as GenerateTitleResponse;
    if (data.thread && !data.skipped) {
      upsertThreadInList(queryClient, data.thread);
    }
    else {
      void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
    }
  }
  catch (error) {
    console.error("[generate-title] request failed", { threadId, error });
  }
}
