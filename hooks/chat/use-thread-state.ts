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

async function patchThreadState(
  threadId: string,
  state: ThreadState,
  queryClient: QueryClient,
  options?: PersistThreadStateOptions,
) {
  const sessionId = state.session.sessionId;
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
      eventCount: state.events.length,
      sessionId,
      detail: detail.slice(0, 500),
    });
    throw new Error(`Failed to persist chat (${response.status})`);
  }

  if (!options?.skipInvalidate) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.threads });
  }
}

function threadStateFromCursor(input: {
  session?: ClientSessionState;
  events?: readonly unknown[];
  agentPrefs?: AgentPrefs;
}): ThreadState | null {
  const events = input.events ? [...input.events] : [];
  const sessionId = input.session?.sessionId;
  if (events.length === 0 && !sessionId) {
    return null;
  }

  return {
    session: {
      ...(sessionId ? { sessionId } : {}),
      streamIndex: input.session?.streamIndex
        ?? (events.length > 0 ? events.length : 0),
    },
    events,
    source: "web",
    ...(input.agentPrefs
      ? { agentPrefs: normalizeAgentPrefs(input.agentPrefs) }
      : {}),
  };
}

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
  const state = threadStateFromCursor({
    session: snapshot.session,
    events: snapshot.events,
    agentPrefs,
  });
  if (!state) {
    return;
  }
  await patchThreadState(threadId, state, queryClient, options);
}

/** Persist the Eve session cursor without replacing a longer stored event log. */
export async function persistSessionCursor(
  threadId: string,
  session: ClientSessionState,
  queryClient: QueryClient,
  agentPrefs?: AgentPrefs,
  options?: PersistThreadStateOptions,
) {
  const state = threadStateFromCursor({
    session,
    events: [],
    agentPrefs,
  });
  if (!state) {
    return;
  }
  await patchThreadState(threadId, state, queryClient, {
    keepalive: true,
    skipInvalidate: true,
    ...options,
  });
}

/** Persist a live-resume catch-up (Eve snapshot + follow) onto the thread row. */
export async function persistLiveResumeState(
  threadId: string,
  input: {
    session: ClientSessionState;
    events: readonly unknown[];
    agentPrefs?: AgentPrefs;
  },
  queryClient: QueryClient,
  options?: PersistThreadStateOptions,
) {
  const state = threadStateFromCursor(input);
  if (!state) {
    return;
  }
  await patchThreadState(threadId, state, queryClient, options);
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
