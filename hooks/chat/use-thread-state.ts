import type { QueryClient } from "@tanstack/react-query";
import type { UseEveAgentSnapshot } from "eve/react";
import type { ClientSessionState, MessageStreamEvent } from "eve/client";
import type { AgentPrefs } from "#shared/agent-modes";
import { normalizeAgentPrefs } from "#shared/agent-modes";
import { resumeOptionsFromThread as resumeFromShared } from "#shared/resume-thread";
import type { ThreadRecord, ThreadState } from "#shared/types/thread";
import { queryKeys } from "~/lib/query-keys";

interface ResumeOptions {
  initialSession?: ClientSessionState;
  initialEvents?: readonly MessageStreamEvent[];
}

export function resumeOptionsFromThread(thread: ThreadRecord): ResumeOptions {
  const options = resumeFromShared(thread);
  return {
    ...(options.initialSession
      ? { initialSession: options.initialSession }
      : {}),
    ...(options.initialEvents
      ? { initialEvents: options.initialEvents as readonly MessageStreamEvent[] }
      : {}),
  };
}

export type PersistThreadStateOptions = {
  /** Prefer keepalive for pagehide / visibility flush during streaming. */
  keepalive?: boolean;
  /**
   * When true, skip invalidateQueries (unload paths). Default invalidates.
   */
  skipInvalidate?: boolean;
};

/**
 * Persist Eve snapshot to Postgres. Writes sessionId even when events are still
 * empty so we can rewind the Eve stream if the transcript PATCH never lands.
 */
export async function persistThreadState(
  threadId: string,
  snapshot: UseEveAgentSnapshot<unknown>,
  queryClient: QueryClient,
  agentPrefs?: AgentPrefs,
  options?: PersistThreadStateOptions,
) {
  const hasEvents = snapshot.events.length > 0;
  const sessionId = snapshot.session?.sessionId;
  if (!hasEvents && !sessionId) {
    return;
  }

  const state: ThreadState = {
    session: {
      ...(sessionId ? { sessionId } : {}),
      streamIndex: hasEvents
        ? snapshot.events.length
        : (snapshot.session?.streamIndex ?? 0),
    },
    events: hasEvents ? [...snapshot.events] : [],
    source: "web",
    ...(agentPrefs ? { agentPrefs: normalizeAgentPrefs(agentPrefs) } : {}),
  };

  const response = await fetch(`/api/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
    ...(options?.keepalive ? { keepalive: true } : {}),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[agent-c persist] client PATCH failed", {
      threadId,
      status: response.status,
      eventCount: snapshot.events.length,
      sessionId,
      detail: detail.slice(0, 500),
    });
    throw new Error(`Failed to persist chat (${response.status})`);
  }

  if (!options?.skipInvalidate) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
  }
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
