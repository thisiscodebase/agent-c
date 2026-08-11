/** Model tiers for Agent C routing. Nano is titles/classification only. */
export type ModelTier = "nano" | "chat" | "premium" | "extreme";

/** Tiers selectable for the main Eve agent (not nano). */
export type AgentTier = Exclude<ModelTier, "nano">;

export const AGENT_TIERS = ["chat", "premium", "extreme"] as const satisfies readonly AgentTier[];

export const MODEL_POOLS = {
  nano: ["openai/gpt-5.4-nano"] as const,
  chat: ["openai/gpt-5.6-luna"] as const,
  premium: [
    "anthropic/claude-sonnet-5",
    "xai/grok-4.5",
    "openai/gpt-5.6-terra",
  ] as const,
  extreme: ["openai/gpt-5.6-sol"] as const,
} as const;

export type NanoModelId = (typeof MODEL_POOLS.nano)[number];
export type ChatModelId = (typeof MODEL_POOLS.chat)[number];
export type PremiumModelId = (typeof MODEL_POOLS.premium)[number];
export type ExtremeModelId = (typeof MODEL_POOLS.extreme)[number];

export const MODEL_DEFAULTS = {
  nano: "openai/gpt-5.4-nano",
  chat: "openai/gpt-5.6-luna",
  premium: "anthropic/claude-sonnet-5",
  extreme: "openai/gpt-5.6-sol",
} as const satisfies Record<ModelTier, string>;

/** Models that have no ZDR-compliant Gateway provider today. */
export const NON_ZDR_MODELS = new Set<string>(["xai/grok-4.5"]);

/**
 * Maximum context window per model, from the AI Gateway model list
 * (`https://ai-gateway.vercel.sh/v1/models`, `context_window`). This is
 * capacity, not the window we want to *use* — see MODEL_COST_TIER_TOKENS.
 */
export const MODEL_MAX_CONTEXT_WINDOW_TOKENS: Record<string, number> = {
  "openai/gpt-5.4-nano": 400_000,
  "openai/gpt-5.6-luna": 1_050_000,
  "openai/gpt-5.6-terra": 1_050_000,
  "openai/gpt-5.6-sol": 1_050_000,
  "anthropic/claude-sonnet-5": 1_000_000,
  "xai/grok-4.5": 500_000,
};

/**
 * Token count at which per-token pricing steps up (Gateway `input_tiers`).
 * Above it, input, output, cache read and cache write all roughly double —
 * e.g. luna goes $0.20/M → $0.40/M. Treat this as the working window: running
 * past it costs twice as much per token for the whole request, so we would
 * rather compact than cross. Models absent here price flat at any length.
 */
export const MODEL_COST_TIER_TOKENS: Record<string, number> = {
  "openai/gpt-5.6-luna": 272_000,
  "openai/gpt-5.6-terra": 272_000,
  "openai/gpt-5.6-sol": 272_000,
  "xai/grok-4.5": 200_000,
};

/** Conservative fallback when the running model is unknown or unlisted. */
export const FALLBACK_CONTEXT_WINDOW_TOKENS = 272_000;

/** Eve reports a dynamically resolved model as `dynamic:<fallback id>`. */
export function normalizeModelId(modelId: string | null | undefined): string | null {
  if (typeof modelId !== "string" || modelId.length === 0) {
    return null;
  }
  const id = modelId.startsWith("dynamic:")
    ? modelId.slice("dynamic:".length)
    : modelId;
  return id.length > 0 ? id : null;
}

/** Hard capacity of the model, for reference and for unlisted-model fallback. */
export function maxContextWindowForModel(modelId: string | null | undefined): number {
  const id = normalizeModelId(modelId);
  if (!id) {
    return FALLBACK_CONTEXT_WINDOW_TOKENS;
  }
  return MODEL_MAX_CONTEXT_WINDOW_TOKENS[id] ?? FALLBACK_CONTEXT_WINDOW_TOKENS;
}

/**
 * The window we actually budget against: the cheap pricing tier where the model
 * has one, otherwise its full capacity. Feeding this to Eve as
 * `modelContextWindowTokens` makes `compaction.thresholdPercent` a fraction of
 * the *affordable* window, so long threads compact instead of silently
 * crossing into double-rate pricing.
 */
export function contextWindowForModel(modelId: string | null | undefined): number {
  const id = normalizeModelId(modelId);
  if (!id) {
    return FALLBACK_CONTEXT_WINDOW_TOKENS;
  }
  return MODEL_COST_TIER_TOKENS[id] ?? maxContextWindowForModel(id);
}

/** @deprecated Use MODEL_DEFAULTS.chat — kept for transitional imports. */
export const CHAT_MODEL = MODEL_DEFAULTS.chat;

/** @deprecated Use MODEL_DEFAULTS.nano — kept for transitional imports. */
export const NANO_MODEL = MODEL_DEFAULTS.nano;

export type GatewayPrivacyOptions = {
  disallowPromptTraining: true;
  zeroDataRetention?: true;
};

export function isAgentTier(value: unknown): value is AgentTier {
  return value === "chat" || value === "premium" || value === "extreme";
}

export function isInPool(tier: ModelTier, modelId: string): boolean {
  return (MODEL_POOLS[tier] as readonly string[]).includes(modelId);
}

export function resolveTierModel(tier: ModelTier, flaggedModel?: string | null): string {
  if (flaggedModel && isInPool(tier, flaggedModel)) {
    return flaggedModel;
  }
  return MODEL_DEFAULTS[tier];
}

export function resolveAgentTier(flaggedTier?: string | null): AgentTier {
  if (isAgentTier(flaggedTier)) {
    return flaggedTier;
  }
  return "chat";
}

export function modelSupportsZdr(modelId: string): boolean {
  return !NON_ZDR_MODELS.has(modelId);
}

/** Per-request AI Gateway privacy filters (free; ZDR omitted for non-ZDR models). */
export function gatewayPrivacyOptions(modelId: string): GatewayPrivacyOptions {
  if (modelSupportsZdr(modelId)) {
    return {
      disallowPromptTraining: true,
      zeroDataRetention: true,
    };
  }
  return {
    disallowPromptTraining: true,
  };
}

/** Reasoning effort for agent tiers; nano calls omit reasoning. */
export function reasoningForTier(tier: ModelTier): "high" | undefined {
  if (tier === "nano") {
    return undefined;
  }
  return "high";
}

export type ResolvedModelSelection = {
  tier: AgentTier;
  model: string;
  reasoning: "high";
  gateway: GatewayPrivacyOptions;
};

export type ResolvedNanoSelection = {
  tier: "nano";
  model: string;
  gateway: GatewayPrivacyOptions;
};

export function buildAgentSelection(
  tier: AgentTier,
  flaggedModel?: string | null,
): ResolvedModelSelection {
  const model = resolveTierModel(tier, flaggedModel);
  return {
    tier,
    model,
    reasoning: "high",
    gateway: gatewayPrivacyOptions(model),
  };
}

export function buildNanoSelection(flaggedModel?: string | null): ResolvedNanoSelection {
  const model = resolveTierModel("nano", flaggedModel);
  return {
    tier: "nano",
    model,
    gateway: gatewayPrivacyOptions(model),
  };
}
