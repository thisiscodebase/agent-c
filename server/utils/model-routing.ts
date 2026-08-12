import {
  agentChatModel,
  agentExtremeModel,
  agentNanoModel,
  agentPremiumModel,
  agentTier,
} from "~~/flags";
import {
  buildAgentSelection,
  buildNanoSelection,
  isAgentReasoningLevel,
  isAgentTier,
  resolveAgentTier,
  type AgentReasoningLevel,
  type AgentTier,
  type ResolvedModelSelection,
  type ResolvedNanoSelection,
} from "~~/shared/models";

type FlagEntities = { user?: { id: string } };

export type ResolveAgentModelSelectionOptions = {
  /** Override Flags `agent-tier` (e.g. Zest→chat, Juice→premium). */
  tier?: AgentTier | null;
  /** Per-turn reasoning effort from the composer. */
  reasoning?: AgentReasoningLevel | null;
};

async function evaluateWithOptionalUser<T>(
  flagFn: {
    (): Promise<T>;
    run: (options: { identify: FlagEntities }) => Promise<T>;
  },
  userId?: string,
): Promise<T> {
  if (userId) {
    return flagFn.run({ identify: { user: { id: userId } } });
  }
  return flagFn();
}

/** Resolve Eve agent tier + model from Vercel Flags (falls back to catalog defaults). */
export async function resolveAgentModelSelection(
  userId?: string,
  options?: ResolveAgentModelSelectionOptions,
): Promise<ResolvedModelSelection> {
  const [tierValue, chatModel, premiumModel, extremeModel] = await Promise.all([
    evaluateWithOptionalUser(agentTier, userId),
    evaluateWithOptionalUser(agentChatModel, userId),
    evaluateWithOptionalUser(agentPremiumModel, userId),
    evaluateWithOptionalUser(agentExtremeModel, userId),
  ]);

  const tier = isAgentTier(options?.tier)
    ? options.tier
    : resolveAgentTier(tierValue);
  const flaggedModel =
    tier === "chat" ? chatModel : tier === "premium" ? premiumModel : extremeModel;
  const reasoning = isAgentReasoningLevel(options?.reasoning)
    ? options.reasoning
    : "high";

  return buildAgentSelection(tier, flaggedModel, reasoning);
}

/** Resolve nano model from Vercel Flags for titles / light tasks. */
export async function resolveNanoModelSelection(
  userId?: string,
): Promise<ResolvedNanoSelection> {
  const model = await evaluateWithOptionalUser(agentNanoModel, userId);
  return buildNanoSelection(model);
}
