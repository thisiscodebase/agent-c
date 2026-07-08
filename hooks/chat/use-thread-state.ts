import type { QueryClient } from "@tanstack/react-query";
import type { UseEveAgentSnapshot } from "eve/react";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import type { ThreadRecord, ThreadState } from "#shared/types/thread";
import { queryKeys } from "~/lib/query-keys";

interface ResumeOptions {
  initialSession?: SessionState;
  initialEvents?: readonly HandleMessageStreamEvent[];
}

export function resumeOptionsFromThread(thread: ThreadRecord): ResumeOptions {
  const events = thread.state?.events;
  if (!events?.length) {
    return {};
  }

  const session = thread.state?.session ?? { streamIndex: 0 };

  return {
    initialSession: {
      ...session,
      streamIndex: Math.max(session.streamIndex ?? 0, events.length),
    },
    initialEvents: events as readonly HandleMessageStreamEvent[],
  };
}

export async function persistThreadState(
  threadId: string,
  snapshot: UseEveAgentSnapshot<unknown>,
  queryClient: QueryClient,
) {
  if (!snapshot.events.length) {
    return;
  }

  const state: ThreadState = {
    session: {
      sessionId: snapshot.session.sessionId,
      continuationToken: snapshot.session.continuationToken,
      streamIndex: snapshot.events.length,
    },
    events: [...snapshot.events],
  };

  await fetch(`/api/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });

  void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
}
