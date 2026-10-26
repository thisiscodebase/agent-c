import { defineAgent, defineDynamic } from "eve";
import {
  MODEL_DEFAULTS,
  contextWindowForModel,
  gatewayPrivacyOptions,
  reasoningProviderOptions,
} from "../../shared/models.js";
import { isAppUserId } from "../../shared/usage-meter.js";
import { fetchAgentModelSelection } from "./model-routing-internal.js";

/** Descriptions the parent model uses to decide when to delegate. */
export const LOOKUP_SUBAGENT_DESCRIPTIONS = {
  researcher:
    "Look up companies, people, programmes, docs, CRM, Drive, Notion, Platform, Tally, Asana, Retool, Companies House, and Eventbrite. Use proactively for multi-source digests, case-study gathering, bid evidence sweeps, and any lookup that needs more than one or two connector calls. Do not use for Slack searches or for a single-connector fact the parent can answer itself.",
  "slack-scan":
    "Search Slack for discussion, decisions, and what was said. Use proactively for workspace sweeps, decision hunts, and any Slack search beyond resolving a known permalink. Do not use for CRM, Drive, Notion, or Platform lookups.",
} as const;

type LookupSubagentSessionCtx = {
  session: {
    auth: {
      current?: {
        principalId?: string;
        attributes?: unknown;
      } | null;
    };
  };
};

async function resolveLookupModel(ctx: LookupSubagentSessionCtx) {
  const principalId = ctx.session.auth.current?.principalId;
  const userId = isAppUserId(principalId) ? principalId : undefined;
  const selection = await fetchAgentModelSelection(userId, {
    tier: "chat",
    reasoning: "high",
  });
  const reasoningOptions = reasoningProviderOptions(
    selection.model,
    selection.reasoning,
  );

  return {
    model: selection.model,
    modelContextWindowTokens: contextWindowForModel(selection.model),
    modelOptions: {
      providerOptions: {
        gateway: selection.gateway ?? gatewayPrivacyOptions(MODEL_DEFAULTS.chat),
        ...reasoningOptions,
      },
    },
  };
}

/**
 * Chat-tier model + privacy options for lookup children.
 * `tool: false` hides the child from the parent model; the same-named
 * workflow tool is what the model calls, and `ctx.agent(name)` still
 * reaches this child. Child Connect OAuth challenges are proxied onto
 * the root channel (`principalType: "user"` on web and linked Slack sessions).
 */
export function defineLookupSubagent(description: string) {
  return defineAgent({
    description,
    tool: false,
    model: defineDynamic({
      events: {
        "session.started": (_event, ctx) => resolveLookupModel(ctx),
      },
    }),
    reasoning: "provider-default",
    compaction: {
      thresholdPercent: 0.85,
    },
  });
}
