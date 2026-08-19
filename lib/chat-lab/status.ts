import type { ChatStatus } from "ai";
import type { EveAgentReducerEvent } from "eve/react";

const STREAMING_TYPES = new Set([
  "turn.started",
  "step.started",
  "reasoning.appended",
  "reasoning.completed",
  "message.appended",
  "message.completed",
  "actions.requested",
  "action.partial",
  "action.result",
  "input.requested",
  "approval.candidate",
  "approval.settled",
  "authorization.required",
  "authorization.completed",
  "subagent.called",
  "subagent.started",
  "subagent.event",
  "subagent.completed",
]);

const READY_TYPES = new Set([
  "turn.completed",
  "turn.cancelled",
  "session.waiting",
  "session.completed",
]);

const ERROR_TYPES = new Set([
  "turn.failed",
  "session.failed",
]);

const SUBMITTED_TYPES = new Set([
  "client.message.submitted",
  "message.received",
]);

/**
 * Derive AI SDK / Eve composer status from the reconciled event prefix.
 *
 * A failed turn stays `error` even if `session.waiting` follows (Eve parks the
 * session after turn.failed). A later `turn.started` clears that failure.
 */
export function deriveChatStatus(
  events: readonly EveAgentReducerEvent[],
): ChatStatus {
  if (events.length === 0) {
    return "ready";
  }

  let lastError = -1;
  let lastTurnStart = -1;
  let lastReady = -1;
  let lastStreaming = -1;
  let lastSubmitted = -1;

  for (let index = 0; index < events.length; index += 1) {
    const type = events[index]!.type;
    if (ERROR_TYPES.has(type)) {
      lastError = index;
    }
    if (type === "turn.started") {
      lastTurnStart = index;
    }
    if (READY_TYPES.has(type)) {
      lastReady = index;
    }
    if (STREAMING_TYPES.has(type)) {
      lastStreaming = index;
    }
    if (SUBMITTED_TYPES.has(type)) {
      lastSubmitted = index;
    }
  }

  if (lastError > lastTurnStart) {
    return "error";
  }
  if (lastReady >= lastStreaming && lastReady >= lastSubmitted && lastReady >= 0) {
    return "ready";
  }
  if (lastStreaming >= 0 && lastStreaming >= lastSubmitted) {
    return "streaming";
  }
  if (lastSubmitted >= 0) {
    return "submitted";
  }
  return "ready";
}

export function isHitlPauseEvent(event: EveAgentReducerEvent): boolean {
  return event.type === "input.requested" || event.type === "authorization.required";
}

export function extractTurnFailureMessage(
  events: readonly EveAgentReducerEvent[],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.type === "turn.failed" || event.type === "session.failed") {
      return event.data.message;
    }
  }
  return undefined;
}
