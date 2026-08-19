import type { EveAgentReducerEvent } from "eve/react";

let eventCounter = 0;

/** Stable stream envelope meta for authored mock events. */
export function eventMeta(id?: string): { id: string; at: string } {
  eventCounter += 1;
  return {
    id: id ?? `mock-evt-${eventCounter.toString().padStart(4, "0")}`,
    at: new Date(1_700_000_000_000 + eventCounter * 50).toISOString(),
  };
}

/** Reset the meta id counter (for deterministic tests). */
export function resetEventMetaCounter(): void {
  eventCounter = 0;
}

export function isClientProjectionEvent(
  event: EveAgentReducerEvent,
): event is Extract<
  EveAgentReducerEvent,
  | { type: "client.message.submitted" }
  | { type: "client.message.failed" }
  | { type: "client.input.responded" }
> {
  return event.type.startsWith("client.");
}
