/** Model tiers for Agent C routing. Nano is titles/classification only. */
export type ModelTier = "nano" | "chat" | "premium" | "extreme";

/** Tiers selectable for the main Eve agent (not nano). */
export type AgentTier = Exclude<ModelTier, "nano">;

export const AGENT_TIERS = ["chat", "premium", "extreme"] as const satisfies readonly AgentTier[];

/** Catalog shortcuts for Flags Explorer. Runtime accepts any Gateway `provider/model`. */
export const MODEL_POOLS = {
  nano: ["openai/gpt-5.4-nano"] as const,
  chat: ["openai/gpt-5.6-luna"] as const,
  premium: [
    "anthropic/claude-sonnet-5",
    "xai/grok-4.5",
    "openai/gpt-5.6-terra",
    "openai/gpt-5.6-sol",
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

/** Providers that have no ZDR-compliant Gateway route today. */
export const NON_ZDR_PROVIDERS = new Set<string>(["xai"]);

/** @deprecated Use NON_ZDR_PROVIDERS — kept for transitional imports. */
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
export const FALLBACK_CONTEXT_WINDOW_TOKENS = 200_000;

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

/**
 * AI Gateway id (`provider/model`). Flags may set any live Gateway string;
 * the in-repo pools are catalog shortcuts, not an allowlist.
 */
const GATEWAY_MODEL_ID_RE =
  /^[a-z0-9][a-z0-9.-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function isGatewayModelId(value: unknown): value is string {
  return typeof value === "string" && GATEWAY_MODEL_ID_RE.test(value.trim());
}

export function isInPool(tier: ModelTier, modelId: string): boolean {
  return (MODEL_POOLS[tier] as readonly string[]).includes(modelId);
}

export function resolveTierModel(tier: ModelTier, flaggedModel?: string | null): string {
  const id = typeof flaggedModel === "string" ? flaggedModel.trim() : "";
  if (isGatewayModelId(id)) {
    return id;
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
  const id = (normalizeModelId(modelId) ?? modelId).trim();
  const slash = id.indexOf("/");
  const provider = (slash > 0 ? id.slice(0, slash) : id).toLowerCase();
  if (NON_ZDR_PROVIDERS.has(provider)) {
    return false;
  }
  return !NON_ZDR_MODELS.has(id);
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

/** Portable reasoning effort for agent turns (nano omits reasoning). */
export type AgentReasoningLevel = "low" | "medium" | "high";

export const AGENT_REASONING_LEVELS = [
  "low",
  "medium",
  "high",
] as const satisfies readonly AgentReasoningLevel[];

export function isAgentReasoningLevel(value: unknown): value is AgentReasoningLevel {
  return value === "low" || value === "medium" || value === "high";
}

/** Reasoning effort for agent tiers; nano calls omit reasoning. */
export function reasoningForTier(tier: ModelTier): AgentReasoningLevel | undefined {
  if (tier === "nano") {
    return undefined;
  }
  return "high";
}

/**
 * Provider-namespaced reasoning options for Gateway calls.
 * Eve's root `reasoning` field is static, so per-turn effort is applied here;
 * these take precedence over top-level `reasoning` in the AI SDK.
 */
export function reasoningProviderOptions(
  modelId: string,
  effort: AgentReasoningLevel,
): Record<string, Record<string, unknown>> {
  const id = normalizeModelId(modelId) ?? modelId;
  if (id.startsWith("openai/")) {
    return {
      openai: {
        reasoningEffort: effort,
        reasoningSummary: "auto",
      },
    };
  }
  if (id.startsWith("anthropic/")) {
    return {
      anthropic: {
        thinking: {
          type: "adaptive",
          effort,
        },
      },
    };
  }
  if (id.startsWith("xai/")) {
    return {
      xai: {
        reasoningEffort: effort,
      },
    };
  }
  return {};
}

export type ResolvedModelSelection = {
  tier: AgentTier;
  model: string;
  reasoning: AgentReasoningLevel;
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
  reasoning: AgentReasoningLevel = "high",
): ResolvedModelSelection {
  const model = resolveTierModel(tier, flaggedModel);
  return {
    tier,
    model,
    reasoning: isAgentReasoningLevel(reasoning) ? reasoning : "high",
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
