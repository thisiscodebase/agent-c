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

/** Fact and progress types Eve 1.0 will hydrate. Anything else throws in the client. */
const READABLE_EVENT_TYPES = new Set([
  "call.input",
  "call.progress",
  "call.requested",
  "call.settled",
  "call.started",
  "child.opened",
  "child.sent",
  "content.completed",
  "content.delta",
  "context.settled",
  "context.started",
  "delivery.admitted",
  "delivery.consumed",
  "delivery.settled",
  "interaction.opened",
  "interaction.settled",
  "model.requested",
  "model.retried",
  "model.settled",
  "model.started",
  "response.admitted",
  "response.settled",
  "response.submitted",
  "session.ended",
  "session.started",
  "task.ended",
  "task.started",
  "turn.paused",
  "turn.settled",
  "turn.started",
  "usage.recorded",
]);

function readPosition(event: unknown): { line: number; index: number } | null {
  if (!event || typeof event !== "object") return null;
  const meta = (event as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") return null;
  const position = (meta as { position?: unknown }).position;
  if (!position || typeof position !== "object") return null;
  const { line, index } = position as { line?: unknown; index?: unknown };
  if (!Number.isSafeInteger(line) || !Number.isSafeInteger(index)) return null;
  return { line: line as number, index: index as number };
}

/** Eve hydrates an event only when it knows the type and the reader attached a position. */
export function isClientReadableLog(events: readonly unknown[]): boolean {
  return events.length > 0 && events.every((event) => {
    if (!event || typeof event !== "object") return false;
    const type = (event as { type?: unknown }).type;
    return typeof type === "string" && READABLE_EVENT_TYPES.has(type) && readPosition(event) !== null;
  });
}

function isV27Stream(events: readonly unknown[]): boolean {
  return readPosition(events[0]) !== null;
}

/**
 * Saved eve 0.69–0.83 rows are v26 lines. Eve 1.0 clients only fold v27 events.
 * Already-v27 snapshots, and logs that do not start at `session.started`, pass through.
 */
/** Names that only exist on the v27 stream. A log that contains one is not a v26 history. */
const V27_ONLY_EVENT_TYPES = new Set([
  "call.input",
  "call.progress",
  "call.requested",
  "call.settled",
  "call.started",
  "child.opened",
  "child.sent",
  "content.completed",
  "content.delta",
  "context.settled",
  "context.started",
  "delivery.admitted",
  "delivery.consumed",
  "delivery.settled",
  "interaction.opened",
  "interaction.settled",
  "model.requested",
  "model.retried",
  "model.settled",
  "model.started",
  "response.admitted",
  "response.settled",
  "response.submitted",
  "session.ended",
  "task.ended",
  "task.started",
  "turn.paused",
  "turn.settled",
  "usage.recorded",
]);

function eventType(event: unknown): string | undefined {
  if (!event || typeof event !== "object") return undefined;
  const type = (event as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

export function sessionEventsForClient(events: readonly unknown[]): readonly unknown[] | undefined {
  if (events.length === 0) return undefined;
  if (isClientReadableLog(events)) return events;
  const firstType = eventType(events[0]);
  const legacy = firstType === "session.started"
    && !isV27Stream(events)
    && events.every((event) => {
      const type = eventType(event);
      return type !== undefined && !V27_ONLY_EVENT_TYPES.has(type);
    });
  if (!legacy) return undefined;
  try {
    const converted = convertLegacyEvents(events);
    return isClientReadableLog(converted) ? converted : undefined;
  } catch {
    return undefined;
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
  const events = storedEvents?.length ? sessionEventsForClient(storedEvents) : undefined;

  // Hook copies and pre-upgrade rows have no reader position. Passing them
  // throws inside useEveAgent. Keep the session and replay it from the start.
  if (!events?.length) {
    if (sessionId) {
      return {
        initialSession: {
          sessionId,
          streamIndex: 0,
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
