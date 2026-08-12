import type { QueryClient } from "@tanstack/react-query";
import type { UseEveAgentSnapshot } from "eve/react";
import type { HandleMessageStreamEvent, SessionState } from "eve/client";
import type { AgentPrefs } from "#shared/agent-modes";
import { normalizeAgentPrefs } from "#shared/agent-modes";
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
  agentPrefs?: AgentPrefs,
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
    ...(agentPrefs ? { agentPrefs: normalizeAgentPrefs(agentPrefs) } : {}),
  };

  const response = await fetch(`/api/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[persist-thread] failed", {
      threadId,
      status: response.status,
      eventCount: snapshot.events.length,
      detail: detail.slice(0, 500),
    });
    throw new Error(`Failed to persist chat (${response.status})`);
  }

  void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
}

/** Persist Zest/Juice + reasoning without touching session/events. */
export async function saveThreadAgentPrefs(
  threadId: string,
  prefs: AgentPrefs,
  queryClient?: QueryClient,
) {
  const agentPrefs = normalizeAgentPrefs(prefs);
  const response = await fetch(`/api/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentPrefs }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[persist-agent-prefs] failed", {
      threadId,
      status: response.status,
      detail: detail.slice(0, 500),
    });
    throw new Error(`Failed to save mode (${response.status})`);
  }

  if (queryClient) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
  }
}
