import type { EveAgentReducerEvent } from "eve/react";

/**
 * Mirrors Eve's agent store: when `message.received` arrives, replace the pending
 * `client.message.submitted` instead of stacking a second user bubble.
 */
export function reconcileEventLog(
  events: readonly EveAgentReducerEvent[],
): EveAgentReducerEvent[] {
  const result: EveAgentReducerEvent[] = [];
  let pendingSubmissionId: string | undefined;

  for (const event of events) {
    if (event.type === "client.message.submitted") {
      pendingSubmissionId = event.data.submissionId;
      result.push(event);
      continue;
    }

    if (event.type === "message.received" && pendingSubmissionId) {
      const submissionId = pendingSubmissionId;
      pendingSubmissionId = undefined;
      const index = result.findIndex(
        (entry) =>
          entry.type === "client.message.submitted"
          && entry.data.submissionId === submissionId,
      );
      if (index >= 0) {
        result[index] = event;
      }
      else {
        result.push(event);
      }
      continue;
    }

    if (event.type === "client.message.failed" && pendingSubmissionId) {
      const submissionId = pendingSubmissionId;
      pendingSubmissionId = undefined;
      const index = result.findIndex(
        (entry) =>
          entry.type === "client.message.submitted"
          && entry.data.submissionId === submissionId,
      );
      if (index >= 0) {
        result[index] = event;
      }
      else {
        result.push(event);
      }
      continue;
    }

    result.push(event);
  }

  return result;
}

/**
 * Apply one event onto a log the way Eve's store does for live playback.
 */
export function appendReconciled(
  events: readonly EveAgentReducerEvent[],
  next: EveAgentReducerEvent,
): EveAgentReducerEvent[] {
  return reconcileEventLog([...events, next]);
}
