/** Event types Eve treats as the end of the current turn (see `isCurrentTurnBoundaryEvent`). */
const TURN_BOUNDARY_TYPES = new Set([
  "session.completed",
  "session.failed",
  "session.waiting",
]);

export function isTurnBoundaryEvent(event: { type: string }): boolean {
  return TURN_BOUNDARY_TYPES.has(event.type);
}

export function streamEventId(event: unknown): string | null {
  if (!event || typeof event !== "object") {
    return null;
  }
  const meta = (event as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") {
    return null;
  }
  const id = (meta as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function eventType(event: unknown): string | undefined {
  if (!event || typeof event !== "object") {
    return undefined;
  }
  const type = (event as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

function turnIdFromEvent(event: unknown): string | undefined {
  if (!event || typeof event !== "object") {
    return undefined;
  }
  const data = (event as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return undefined;
  }
  const turnId = (data as { turnId?: unknown }).turnId;
  return typeof turnId === "string" && turnId.length > 0 ? turnId : undefined;
}

/** Latest `turn.started` that has not been followed by a turn-boundary event. */
export function getOpenTurnId(events: readonly unknown[]): string | undefined {
  let turnId: string | undefined;

  for (const event of events) {
    const type = eventType(event);
    if (type === "turn.started") {
      turnId = turnIdFromEvent(event);
    }
    else if (type && isTurnBoundaryEvent({ type })) {
      turnId = undefined;
    }
  }

  return turnId;
}

export function appendUniqueStreamEvent<T>(
  events: readonly T[],
  event: T,
): T[] {
  const id = streamEventId(event);
  if (id && events.some((existing) => streamEventId(existing) === id)) {
    return events as T[];
  }
  return [...events, event];
}

/** Merge two stream prefixes, dropping duplicates by `meta.id`. */
export function mergeStreamEventLogs<T>(
  events: readonly T[],
  incoming: readonly T[],
): T[] {
  if (incoming.length === 0) {
    return events as T[];
  }

  let merged: T[] = [...events];
  for (const event of incoming) {
    merged = appendUniqueStreamEvent(merged, event);
  }
  return merged;
}
