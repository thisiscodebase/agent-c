import { convertLegacyEvents } from "eve/internal/legacy-events";
import type { ThreadRecord } from "./types/thread.ts";

/** Cursor shape expected by Eve `useEveAgent` (`ClientSessionState`). */
export type ResumeSessionCursor = {
  sessionId: string;
  streamIndex: number;
};

export type ResumeOptionsFromThread = {
  initialSession?: ResumeSessionCursor;
  initialEvents?: readonly unknown[];
};

function isV27Stream(events: readonly unknown[]): boolean {
  const first = events[0];
  if (!first || typeof first !== "object") return false;
  const meta = (first as { meta?: { position?: unknown } }).meta;
  return Boolean(meta && typeof meta === "object" && "position" in meta);
}

/**
 * Saved eve 0.69–0.83 rows are v26 lines. Eve 1.0 clients only fold v27 events.
 * Already-v27 snapshots, and logs that do not start at `session.started`, pass through.
 */
export function sessionEventsForClient(events: readonly unknown[]): readonly unknown[] {
  if (events.length === 0 || isV27Stream(events)) return events;
  const first = events[0] as { type?: unknown };
  if (first.type !== "session.started") return events;
  try {
    return convertLegacyEvents(events);
  } catch {
    return events;
  }
}

function streamCoverage(events: readonly unknown[], storedIndex: number | undefined): number {
  if (isV27Stream(events)) {
    const last = events.at(-1) as { meta?: { next?: unknown; position?: { line?: unknown } } } | undefined;
    const next = last?.meta?.next;
    if (typeof next === "number") return Math.max(storedIndex ?? 0, next);
    const line = last?.meta?.position?.line;
    if (typeof line === "number") return Math.max(storedIndex ?? 0, line + 1);
    return storedIndex ?? 0;
  }
  return Math.max(storedIndex ?? 0, events.length);
}

/**
 * Build Eve resume options from a persisted Postgres thread row.
 * Session-only rows (ingest wrote sessionId before events) still attach.
 */
export function resumeOptionsFromThread(thread: ThreadRecord): ResumeOptionsFromThread {
  const storedEvents = thread.state?.events;
  const session = thread.state?.session;
  const sessionId = session?.sessionId;
  // Capture this before conversion. convertLegacyEvents may stamp v27 metadata
  // onto the saved objects, which would hide that they were one line each.
  const storedIsV27 = Boolean(storedEvents?.length && isV27Stream(storedEvents));
  const events = storedEvents?.length ? sessionEventsForClient(storedEvents) : storedEvents;

  if (!events?.length) {
    if (sessionId) {
      return {
        initialSession: {
          sessionId,
          streamIndex: session?.streamIndex ?? 0,
        },
      };
    }
    return {};
  }

  const streamIndex = storedIsV27
    ? streamCoverage(storedEvents ?? [], session?.streamIndex)
    : Math.max(session?.streamIndex ?? 0, storedEvents?.length ?? 0);

  if (!sessionId) {
    return {
      initialEvents: events,
    };
  }

  return {
    initialSession: {
      sessionId,
      streamIndex,
    },
    initialEvents: events,
  };
}
