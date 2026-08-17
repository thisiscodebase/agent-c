import { dedupe, flag } from "flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";
import { headers } from "next/headers";
import { auth } from "~~/auth";
import {
  AGENT_TIERS,
  MODEL_DEFAULTS,
  MODEL_POOLS,
  type AgentTier,
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

export const agentNanoModel = flag<string, Entities>({
  key: "agent-nano-model",
  description:
    "AI Gateway model id for nano-tier work (thread titles). Any `provider/model` string; catalog options are shortcuts.",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.nano,
  options: modelOptions(MODEL_POOLS.nano),
});

export const agentChatModel = flag<string, Entities>({
  key: "agent-chat-model",
  description:
    "AI Gateway model id for the chat tier (Zest). Any `provider/model` string; catalog options are shortcuts.",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.chat,
  options: modelOptions(MODEL_POOLS.chat),
});

export const agentPremiumModel = flag<string, Entities>({
  key: "agent-premium-model",
  description:
    "AI Gateway model id for the premium tier (Juice). Any `provider/model` string; catalog options are shortcuts. xAI models omit ZDR automatically.",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.premium,
  options: modelOptions(MODEL_POOLS.premium),
});

export const agentExtremeModel = flag<string, Entities>({
  key: "agent-extreme-model",
  description:
    "AI Gateway model id for the extreme tier. Any `provider/model` string; catalog options are shortcuts.",
  adapter: vercelAdapter(),
  identify,
  defaultValue: MODEL_DEFAULTS.extreme,
  options: modelOptions(MODEL_POOLS.extreme),
});
