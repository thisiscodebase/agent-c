import { normalizeAgentPrefs, type AgentPrefs } from "./agent-modes.ts";
import type { ThreadState, ThreadTitleMeta } from "./types/thread.ts";

/**
 * Merge an incoming thread state patch onto existing durable state.
 * Never shrinks the event log — title-only / prefs writers historically
 * sent `events: []` and could race a successful persist.
 */
export function mergeThreadState(
  existing: ThreadState | null,
  incoming: ThreadState,
): ThreadState {
  const session = incoming.session;
  const existingEvents = existing?.events ?? [];
  const events = incoming.events.length >= existingEvents.length
    ? incoming.events
    : existingEvents;

  return {
    session: {
      sessionId: session.sessionId ?? existing?.session.sessionId,
      continuationToken: session.continuationToken ?? existing?.session.continuationToken,
      streamIndex: Math.max(session.streamIndex, existing?.session.streamIndex ?? 0),
    },
    events,
    titleMeta: incoming.titleMeta ?? existing?.titleMeta,
    agentPrefs: incoming.agentPrefs ?? existing?.agentPrefs,
    source: incoming.source ?? existing?.source,
  };
}

export function applyTitleMeta(
  existing: ThreadState | null,
  titleMeta: ThreadTitleMeta,
): ThreadState {
  return {
    session: existing?.session ?? { streamIndex: 0 },
    events: existing?.events ?? [],
    titleMeta,
    agentPrefs: existing?.agentPrefs,
    source: existing?.source,
  };
}

export function applyAgentPrefs(
  existing: ThreadState | null,
  agentPrefs: AgentPrefs,
): ThreadState {
  return {
    session: existing?.session ?? { streamIndex: 0 },
    events: existing?.events ?? [],
    titleMeta: existing?.titleMeta,
    agentPrefs: normalizeAgentPrefs(agentPrefs),
    source: existing?.source,
  };
}

/** Whether merge kept the longer stored log instead of the incoming patch. */
export function keptLongerEventLog(
  existing: ThreadState | null,
  incoming: ThreadState,
): boolean {
  const stored = existing?.events.length ?? 0;
  return incoming.events.length < stored;
}
