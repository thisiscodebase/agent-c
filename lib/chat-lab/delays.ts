/**
 * Playback gaps tuned from real Eve dumps in `docs/local_chats.json`.
 *
 * State *order* is already accurate (same reducer). These numbers match typical
 * inter-event gaps so presence, tool rows, and Streamdown blur-in have time to
 * play — not a 1:1 replay of every 12ms token tick.
 *
 * Observed medians (ms) across a few production-like threads:
 * - message.appended: 12 (tiny tokens) or ~390–440 (larger chunks)
 * - reasoning.appended: ~290–490
 * - action.result: ~150–490 (p90 often 0.6–3s)
 * - step.started / first token: ~330 (TTFT)
 * - turn.completed / session.waiting: ~5–20
 */

import type { EveAgentReducerEvent } from "eve/react";

function toolNameFromResult(event: EveAgentReducerEvent): string | undefined {
  if (event.type !== "action.result") return undefined;
  const result = event.data.result as { toolName?: string; kind?: string } | undefined;
  if (!result) return undefined;
  if (typeof result.toolName === "string") return result.toolName;
  if (result.kind === "subagent-result") return "subagent";
  return undefined;
}

function baseDelay(event: EveAgentReducerEvent): number {
  switch (event.type) {
    case "client.message.submitted":
    case "message.received":
    case "session.started":
    case "step.completed":
    case "turn.completed":
    case "session.waiting":
      return 12;
    case "turn.started":
      return 80;
    case "step.started":
      return 320;
    case "reasoning.appended":
      return 320;
    case "reasoning.completed":
      return 40;
    case "message.appended":
      return 85;
    case "message.completed":
      return 420;
    case "actions.requested":
      return 380;
    case "action.partial":
      return 220;
    case "action.result": {
      const toolName = toolNameFromResult(event) ?? "";
      if (toolName === "create_artifact") return 1600;
      if (toolName === "save_memory") return 420;
      if (toolName === "subagent" || toolName.startsWith("eve:subagent:")) return 80;
      if (toolName.includes("slack")) return 1100;
      if (toolName.includes("asana") || toolName.includes("tally")) return 750;
      if (toolName.includes("notion") || toolName.includes("platform")) return 650;
      if (toolName.includes("hubspot") || toolName.includes("drive") || toolName.includes("search")) {
        return 500;
      }
      return 700;
    }
    case "subagent.called":
      return 220;
    case "subagent.started":
      return 180;
    case "subagent.event": {
      const inner = event.data.event;
      switch (inner.type) {
        case "reasoning.appended":
          return 420;
        case "reasoning.completed":
          return 40;
        case "actions.requested":
          return 520;
        case "action.result":
          return 640;
        case "message.appended":
          return 280;
        case "message.completed":
          return 80;
        default:
          return 220;
      }
    }
    case "subagent.completed": {
      const name = "subagentName" in event.data ? event.data.subagentName : "";
      if (name.includes("slack")) return 2800;
      if (name.includes("crm") || name.includes("hubspot")) return 1600;
      if (name.includes("drive") || name.includes("docs")) return 900;
      if (name.includes("platform")) return 2200;
      return 1400;
    }
    case "input.requested":
    case "authorization.required":
      return 0;
    case "turn.failed":
    case "session.failed":
      return 900;
    default:
      return 80;
  }
}

/**
 * Delay before applying `event`, given the previously applied event.
 * Extra TTFT is added when the first visible token follows `step.started`.
 */
export function delayForEvent(
  event: EveAgentReducerEvent,
  previous?: EveAgentReducerEvent,
): number {
  const delay = baseDelay(event);
  if (previous?.type !== "step.started") {
    return delay;
  }

  const firstVisible =
    event.type === "reasoning.appended"
    || event.type === "message.appended"
    || event.type === "actions.requested";

  return firstVisible ? delay + 280 : delay;
}
