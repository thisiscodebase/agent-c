import type { AgentTier } from "./models";

/** User-facing composer modes (maps onto agent model tiers). */
export type AgentModeId = "zest" | "juice";

/** Reasoning effort exposed in the composer mode picker. */
export type AgentReasoningEffort = "low" | "medium" | "high";

export type AgentModeIcon = "citrus" | "glass-water";

export type AgentModeDefinition = {
  id: AgentModeId;
  label: string;
  icon: AgentModeIcon;
  tier: Exclude<AgentTier, "extreme">;
  description: string;
  whenToUse: string;
};

export type AgentPrefs = {
  mode: AgentModeId;
  reasoning: AgentReasoningEffort;
};

export const AGENT_MODE_IDS = ["zest", "juice"] as const satisfies readonly AgentModeId[];

export const AGENT_REASONING_EFFORTS = [
  "low",
  "medium",
  "high",
] as const satisfies readonly AgentReasoningEffort[];

export const DEFAULT_AGENT_PREFS = {
  mode: "zest",
  reasoning: "high",
} as const satisfies AgentPrefs;

export const AGENT_MODES = [
  {
    id: "zest",
    label: "Zest",
    icon: "citrus",
    tier: "chat",
    description:
      "Fast everyday mode for lookups, summaries, and pulling info from your connected apps.",
    whenToUse:
      "The default for most queries and quick follow-ups where speed matters.",
  },
  {
    id: "juice",
    label: "Juice",
    icon: "glass-water",
    tier: "premium",
    description:
      "Extra juice for deeper synthesis, complex cross-source questions, and large documents.",
    whenToUse:
      "Give a query Juice when you need careful judgment, strong intelligence, or substantial work.",
  },
] as const satisfies readonly AgentModeDefinition[];

export function isAgentModeId(value: unknown): value is AgentModeId {
  return value === "zest" || value === "juice";
}

export function isAgentReasoningEffort(value: unknown): value is AgentReasoningEffort {
  return value === "low" || value === "medium" || value === "high";
}

export function getAgentMode(id: AgentModeId): AgentModeDefinition {
  const mode = AGENT_MODES.find((entry) => entry.id === id);
  if (!mode) {
    return AGENT_MODES[0];
  }
  return mode;
}

export function modeToTier(mode: AgentModeId): Exclude<AgentTier, "extreme"> {
  return getAgentMode(mode).tier;
}

export function normalizeAgentPrefs(value: unknown): AgentPrefs {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_AGENT_PREFS };
  }
  const record = value as Record<string, unknown>;
  return {
    mode: isAgentModeId(record.mode) ? record.mode : DEFAULT_AGENT_PREFS.mode,
    reasoning: isAgentReasoningEffort(record.reasoning)
      ? record.reasoning
      : DEFAULT_AGENT_PREFS.reasoning,
  };
}

export function toggleAgentMode(mode: AgentModeId): AgentModeId {
  return mode === "zest" ? "juice" : "zest";
}

/** Default reasoning when switching into a mode (Zest=high, Juice=medium). */
export function defaultReasoningForMode(mode: AgentModeId): AgentReasoningEffort {
  switch (mode) {
    case "zest":
      return "high";
    case "juice":
      return "medium";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Switch mode and apply that mode's default reasoning. */
export function prefsForMode(mode: AgentModeId): AgentPrefs {
  return {
    mode,
    reasoning: defaultReasoningForMode(mode),
  };
}

export function toggleAgentPrefs(prefs: AgentPrefs): AgentPrefs {
  return prefsForMode(toggleAgentMode(prefs.mode));
}

export function reasoningEffortIndex(effort: AgentReasoningEffort): number {
  return AGENT_REASONING_EFFORTS.indexOf(effort);
}

export function stepReasoningEffort(
  effort: AgentReasoningEffort,
  delta: -1 | 1,
): AgentReasoningEffort {
  const index = reasoningEffortIndex(effort);
  const next = Math.min(
    AGENT_REASONING_EFFORTS.length - 1,
    Math.max(0, index + delta),
  );
  return AGENT_REASONING_EFFORTS[next]!;
}

export function reasoningEffortLabel(effort: AgentReasoningEffort): string {
  switch (effort) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default: {
      const _exhaustive: never = effort;
      return _exhaustive;
    }
  }
}
