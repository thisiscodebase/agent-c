import { dedupe, flag } from "flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";
import { headers } from "next/headers";
import { auth } from "~~/auth";
import {
  AGENT_TIERS,
  MODEL_DEFAULTS,
  MODEL_POOLS,
  type AgentTier,
  type ChatModelId,
  type ExtremeModelId,
  type NanoModelId,
  type PremiumModelId,
} from "~~/shared/models";

type Entities = {
  user?: { id: string };
};

const identify = dedupe(async (): Promise<Entities> => {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({ headers: headerList });
    if (!session?.user?.id) {
      return {};
    }
    return { user: { id: session.user.id } };
  } catch {
    return {};
  }
});

function modelOptions<T extends string>(models: readonly T[]) {
  return models.map((value) => ({ value, label: value }));
}

export const agentTier = flag<AgentTier, Entities>({
  key: "agent-tier",
  description: "Which model tier the Eve agent uses for sessions (chat, premium, or extreme).",
  adapter: vercelAdapter(),
  identify,
  defaultValue: "chat",
  options: AGENT_TIERS.map((value) => ({ value, label: value })),
});

export const agentNanoModel = flag<NanoModelId, Entities>({
  key: "agent-nano-model",
  description: "Model for nano-tier work (thread titles, light classification).",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.nano,
  options: modelOptions(MODEL_POOLS.nano),
});

export const agentChatModel = flag<ChatModelId, Entities>({
  key: "agent-chat-model",
  description: "Model for the chat tier (default agent sessions).",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.chat,
  options: modelOptions(MODEL_POOLS.chat),
});

export const agentPremiumModel = flag<PremiumModelId, Entities>({
  key: "agent-premium-model",
  description:
    "Model for the premium tier. Grok 4.5 keeps no-training but disables ZDR automatically.",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.premium,
  options: modelOptions(MODEL_POOLS.premium),
});

export const agentExtremeModel = flag<ExtremeModelId, Entities>({
  key: "agent-extreme-model",
  description: "Model for the extreme tier (frontier / high-stakes work).",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.extreme,
  options: modelOptions(MODEL_POOLS.extreme),
});
