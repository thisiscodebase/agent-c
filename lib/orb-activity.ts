import type { ChatStatus } from "ai";
import type { EveMessage, EveMessagePart } from "eve/react";
import type { OrbState } from "~/components/ui/agent-orb";
import { orbStateForCategory } from "~/lib/subagent-orb";
import {
  getReasoningSummaryLabel,
  getToolDisplayInfo,
} from "~/lib/tool-call-display";

export type OrbActivity = {
  state: OrbState;
  label: string;
};

const ACTIVE_TOOL_STATES = new Set([
  "input-streaming",
  "input-available",
  "approval-responded",
]);

export type LiveOrbTool = {
  category: string;
  label: string;
};

export type LiveOrbReasoning = {
  text: string;
};

/** True when the assistant is blocked on approval / input / OAuth. */
export function isWaitingForUser(message: EveMessage): boolean {
  return message.parts.some((part) => {
    if (part.type === "authorization" && part.state !== "completed") return true;
    if (part.type !== "dynamic-tool") return false;
    if (part.state === "approval-requested") return true;
    if (part.toolMetadata?.eve?.inputRequest) return true;
    return false;
  });
}

function isVisiblePart(part: EveMessagePart): boolean {
  if (part.type === "step-start") return false;
  if (part.type === "reasoning") {
    return part.state === "streaming" || Boolean(part.text?.trim());
  }
  if (part.type === "dynamic-tool") return true;
  if (part.type === "text") return Boolean(part.text?.trim());
  if (part.type === "authorization") return true;
  return true;
}

export function hasVisibleAssistantParts(message: EveMessage): boolean {
  if (message.role !== "assistant") return false;
  return message.parts.some(isVisiblePart);
}

function isInteractiveTool(
  part: Extract<EveMessagePart, { type: "dynamic-tool" }>,
): boolean {
  if (part.toolName === "save_memory") return true;
  if (part.toolName === "create_artifact") return true;
  if (part.state === "approval-requested") return true;
  if (part.toolMetadata?.eve?.inputRequest) return true;
  return false;
}

/** Live tool / reasoning signals from an assistant message's parts. */
export function getLiveOrbSignals(message: EveMessage | undefined): {
  liveReasoning: LiveOrbReasoning | null;
  liveTool: LiveOrbTool | null;
  streamingText: boolean;
  connecting: boolean;
  waitingForUser: boolean;
  creatingArtifact: boolean;
} {
  if (!message || message.role !== "assistant") {
    return {
      liveReasoning: null,
      liveTool: null,
      streamingText: false,
      connecting: false,
      waitingForUser: false,
      creatingArtifact: false,
    };
  }

  let liveReasoning: LiveOrbReasoning | null = null;
  let liveTool: LiveOrbTool | null = null;
  let handoffCount = 0;
  let streamingText = false;
  let connecting = false;
  let creatingArtifact = false;

  for (const part of message.parts) {
    if (part.type === "authorization" && part.state !== "completed") {
      connecting = true;
    }
    if (part.type === "text" && part.state === "streaming" && part.text?.trim()) {
      streamingText = true;
    }
    if (part.type === "reasoning" && part.state === "streaming") {
      liveReasoning = { text: part.text };
    }
    if (part.type === "dynamic-tool") {
      if (part.toolName === "create_artifact" && ACTIVE_TOOL_STATES.has(part.state)) {
        creatingArtifact = true;
      }
      if (!isInteractiveTool(part) && ACTIVE_TOOL_STATES.has(part.state)) {
        const display = getToolDisplayInfo(part.toolName, part.input);
        if (display.category === "handoff") {
          handoffCount += 1;
          liveTool = {
            category: "handoff",
            label:
              handoffCount > 1
                ? `Working via ${handoffCount} subagents`
                : "Working via subagent",
          };
        } else {
          liveTool = {
            category: display.category,
            label: display.runningLabel,
          };
        }
      }
    }
  }

  return {
    liveReasoning,
    liveTool,
    streamingText,
    connecting,
    waitingForUser: isWaitingForUser(message),
    creatingArtifact,
  };
}

/**
 * Show the persistent agent presence for the whole busy turn.
 * Stays until stream completion (`ready` / `error`), morphing between states.
 */
export function shouldShowAgentPresence(
  messages: readonly EveMessage[],
  status: ChatStatus | undefined,
): boolean {
  return status === "submitted" || status === "streaming";
}

/** Map live signals to orb state + label. Always returns while the turn is busy. */
export function resolveOrbActivity(input: {
  status?: ChatStatus;
  liveReasoning?: LiveOrbReasoning | null;
  liveTool?: LiveOrbTool | null;
  pending?: boolean;
  waitingForUser?: boolean;
  connecting?: boolean;
  streamingText?: boolean;
  creatingArtifact?: boolean;
}): OrbActivity | null {
  const busy =
    input.pending ||
    input.status === "submitted" ||
    input.status === "streaming";

  if (!busy) return null;

  if (input.waitingForUser) {
    return { state: "listening", label: "Waiting for you…" };
  }

  if (input.connecting) {
    return { state: "connecting", label: "Connecting…" };
  }

  if (input.liveTool) {
    const { category, label } = input.liveTool;
    return { state: orbStateForCategory(category), label };
  }

  if (input.liveReasoning) {
    return {
      state: "solving",
      label: getReasoningSummaryLabel({
        isStreaming: true,
        text: input.liveReasoning.text,
      }),
    };
  }

  if (input.creatingArtifact) {
    return { state: "composing", label: "Writing…" };
  }

  if (input.streamingText) {
    return { state: "composing", label: "Writing…" };
  }

  // Gaps between tools / early turn / submitted — keep the orb alive.
  return { state: "breathing", label: "Thinking…" };
}

/** Resolve presence for the current busy turn from messages + status. */
export function resolveTurnOrbActivity(
  messages: readonly EveMessage[],
  status: ChatStatus | undefined,
): OrbActivity | null {
  if (!shouldShowAgentPresence(messages, status)) return null;

  const last = messages.at(-1);
  const activeAssistant =
    last?.role === "assistant" ? last : undefined;
  const signals = getLiveOrbSignals(activeAssistant);

  return resolveOrbActivity({
    status,
    pending: !activeAssistant || !hasVisibleAssistantParts(activeAssistant),
    liveReasoning: signals.liveReasoning,
    liveTool: signals.liveTool,
    waitingForUser: signals.waitingForUser,
    connecting: signals.connecting,
    streamingText: signals.streamingText,
    creatingArtifact: signals.creatingArtifact,
  });
}
