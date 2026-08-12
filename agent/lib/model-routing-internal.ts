import type { AgentModeId, AgentReasoningEffort } from "../../shared/agent-modes.js";
import { modeToTier } from "../../shared/agent-modes.js";
import type {
  AgentReasoningLevel,
  AgentTier,
  ResolvedModelSelection,
} from "../../shared/models.js";
import { buildAgentSelection } from "../../shared/models.js";
import { appOrigin, internalHeaders } from "./internal-api.js";

export type FetchAgentModelSelectionOptions = {
  tier?: AgentTier;
  reasoning?: AgentReasoningLevel;
};

export async function fetchAgentModelSelection(
  userId?: string,
  options?: FetchAgentModelSelectionOptions,
): Promise<ResolvedModelSelection> {
  const fallbackTier = options?.tier ?? "chat";
  const fallbackReasoning = options?.reasoning ?? "high";
  try {
    const url = new URL("/api/internal/model-routing", appOrigin());
    if (userId) {
      url.searchParams.set("userId", userId);
    }
    if (options?.tier) {
      url.searchParams.set("tier", options.tier);
    }
    if (options?.reasoning) {
      url.searchParams.set("reasoning", options.reasoning);
    }

    const response = await fetch(url, { headers: internalHeaders() });
    if (!response.ok) {
      return buildAgentSelection(fallbackTier, null, fallbackReasoning);
    }

    const data = (await response.json()) as ResolvedModelSelection;
    if (!data?.model || !data?.tier || !data?.gateway) {
      return buildAgentSelection(fallbackTier, null, fallbackReasoning);
    }

    return {
      ...data,
      reasoning: data.reasoning ?? fallbackReasoning,
    };
  } catch {
    return buildAgentSelection(fallbackTier, null, fallbackReasoning);
  }
}

export function selectionFromAuthAttributes(attributes: unknown): {
  tier: AgentTier;
  reasoning: AgentReasoningLevel;
} {
  const record =
    attributes && typeof attributes === "object"
      ? (attributes as Record<string, unknown>)
      : {};
  const mode = record.agentMode as AgentModeId | undefined;
  const reasoning = record.agentReasoning as AgentReasoningEffort | undefined;
  return {
    tier: mode === "juice" || mode === "zest" ? modeToTier(mode) : "chat",
    reasoning:
      reasoning === "low" || reasoning === "medium" || reasoning === "high"
        ? reasoning
        : "high",
  };
}
