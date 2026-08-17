/**
 * Pure model-routing helpers (no env / network). Shared so unit tests and the
 * agent internal client stay in sync.
 */

import {
  DEFAULT_AGENT_PREFS,
  isAgentModeId,
  isAgentReasoningEffort,
  modeToTier,
  type AgentReasoningEffort,
} from "./agent-modes.ts";
import type { AgentTier } from "./models.ts";

export type AuthModelSelection = {
  tier: Exclude<AgentTier, "extreme">;
  reasoning: AgentReasoningEffort;
};

/**
 * Prefer mode/reasoning stamped on the session auth attributes (web chat).
 * Falls back to defaults when attributes are missing (e.g. Slack).
 */
export function selectionFromAuthAttributes(
  attributes: unknown,
): AuthModelSelection {
  if (!attributes || typeof attributes !== "object") {
    return {
      tier: modeToTier(DEFAULT_AGENT_PREFS.mode),
      reasoning: DEFAULT_AGENT_PREFS.reasoning,
    };
  }

  const record = attributes as Record<string, unknown>;
  const mode = isAgentModeId(record.agentMode)
    ? record.agentMode
    : DEFAULT_AGENT_PREFS.mode;
  const reasoning = isAgentReasoningEffort(record.agentReasoning)
    ? record.agentReasoning
    : DEFAULT_AGENT_PREFS.reasoning;

  return {
    tier: modeToTier(mode),
    reasoning,
  };
}
