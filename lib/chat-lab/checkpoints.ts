import type { EveAgentReducerEvent } from "eve/react";
import type { ChatLabCheckpoint, ChatLabCheckpointKind } from "./types.ts";

function firstIndex(
  events: readonly EveAgentReducerEvent[],
  predicate: (event: EveAgentReducerEvent) => boolean,
): number | undefined {
  for (let index = 0; index < events.length; index += 1) {
    if (predicate(events[index]!)) {
      return index + 1;
    }
  }
  return undefined;
}

/**
 * Build scrubber markers from the authored scenario event list (pre-reconcile).
 * Indices are exclusive upper bounds suitable for `seek(index)`.
 */
export function buildCheckpoints(
  events: readonly EveAgentReducerEvent[],
): ChatLabCheckpoint[] {
  const checkpoints: ChatLabCheckpoint[] = [];
  const seen = new Set<ChatLabCheckpointKind>();

  function add(
    kind: ChatLabCheckpointKind,
    index: number | undefined,
    label: string,
  ) {
    if (index === undefined || seen.has(kind)) return;
    seen.add(kind);
    checkpoints.push({ kind, index, label });
  }

  add(
    "submitted",
    firstIndex(
      events,
      (event) =>
        event.type === "client.message.submitted" || event.type === "message.received",
    ),
    "Submitted",
  );
  add(
    "reasoning",
    firstIndex(events, (event) => event.type === "reasoning.appended"),
    "Reasoning",
  );
  add(
    "tool",
    firstIndex(events, (event) => event.type === "actions.requested"),
    "Tool call",
  );
  add(
    "hitl",
    firstIndex(
      events,
      (event) =>
        event.type === "input.requested" || event.type === "authorization.required",
    ),
    "Waiting for you",
  );
  add(
    "text",
    firstIndex(events, (event) => event.type === "message.appended"),
    "Assistant text",
  );
  add(
    "complete",
    firstIndex(
      events,
      (event) => event.type === "turn.completed" || event.type === "session.waiting",
    ),
    "Complete",
  );
  add(
    "error",
    firstIndex(
      events,
      (event) => event.type === "turn.failed" || event.type === "session.failed",
    ),
    "Error",
  );

  return checkpoints.sort((a, b) => a.index - b.index);
}

/**
 * Next/previous scrubber checkpoint from `currentIndex`.
 * Falls back to 0 (back) or `eventCount` (forward) when none remain.
 */
export function adjacentCheckpointIndex(
  checkpoints: readonly ChatLabCheckpoint[],
  currentIndex: number,
  direction: -1 | 1,
  eventCount: number,
): number {
  if (direction === 1) {
    const next = checkpoints.find((checkpoint) => checkpoint.index > currentIndex);
    return next?.index ?? eventCount;
  }

  for (let index = checkpoints.length - 1; index >= 0; index -= 1) {
    const checkpoint = checkpoints[index]!;
    if (checkpoint.index < currentIndex) {
      return checkpoint.index;
    }
  }
  return 0;
}

