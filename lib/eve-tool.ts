import type { DynamicToolUIPart } from "ai";
import type { EveMessagePart, EveToolPart } from "eve/react";

export type ToolUiState = DynamicToolUIPart["state"];

const RUNNING_STATES = new Set<EveToolPart["state"]>([
  "streaming",
  "requested",
  "running",
  "approval",
  "blocked",
]);

const FINISHED_STATES = new Set<EveToolPart["state"]>([
  "completed",
  "failed",
  "rejected",
  "cancelled",
]);

export function isToolPart(part: EveMessagePart): part is EveToolPart {
  return part.type === "tool";
}

export function toolInput(part: EveToolPart): unknown {
  return part.state === "streaming" ? undefined : part.input;
}

export function toolOutput(part: EveToolPart): unknown {
  return part.state === "streaming" ? undefined : part.output;
}

export function toolErrorText(part: EveToolPart): string | undefined {
  return part.state === "streaming" ? undefined : part.error?.message;
}

export function toolIsRunning(part: EveToolPart): boolean {
  return RUNNING_STATES.has(part.state);
}

export function toolIsFinished(part: EveToolPart): boolean {
  return FINISHED_STATES.has(part.state);
}

export function toolHasOpenInteraction(part: EveToolPart): boolean {
  return part.interaction?.status === "open";
}

/** Map Eve's call state onto the AI Elements tool badge states. */
export function toolUiState(part: EveToolPart): ToolUiState {
  switch (part.state) {
    case "streaming":
    case "requested":
      return "input-streaming";
    case "approval":
    case "blocked":
      return part.interaction?.answer ? "approval-responded" : "approval-requested";
    case "running":
      return "input-available";
    case "completed":
      return "output-available";
    case "rejected":
      return "output-denied";
    case "failed":
    case "cancelled":
      return "output-error";
    default: {
      const _never: never = part;
      return _never;
    }
  }
}
