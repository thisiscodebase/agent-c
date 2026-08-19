import { defineAgent } from "eve";
import {
  MODEL_DEFAULTS,
  contextWindowForModel,
  gatewayPrivacyOptions,
  reasoningProviderOptions,
} from "../../shared/models.js";
import { isAppUserId } from "../../shared/usage-meter.js";
import { lookupFindingsSchema } from "./lookup-findings.js";
import { fetchAgentModelSelection } from "./model-routing-internal.js";

/** Descriptions the parent model uses to decide when to delegate. */
export const LOOKUP_SUBAGENT_DESCRIPTIONS = {
  researcher:
    "Look up companies, people, programmes, docs, CRM, Drive, Notion, Platform, Tally, Asana, Retool, and Companies House. Use proactively for multi-source digests, case-study gathering, bid evidence sweeps, and any lookup that needs more than one or two connector calls. Do not use for Slack searches or for a single-connector fact the parent can answer itself.",
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

/**
 * Chat-tier model + privacy options for lookup children.
 * Child Connect OAuth challenges are proxied onto the root channel
 * (`principalType: "user"` on web and linked Slack sessions).
 */
export async function resolveLookupSubagent(
  ctx: LookupSubagentSessionCtx,
  description: string,
) {
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

  return defineAgent({
    description,
    model: selection.model,
    modelContextWindowTokens: contextWindowForModel(selection.model),
    modelOptions: {
      providerOptions: {
        gateway: selection.gateway ?? gatewayPrivacyOptions(MODEL_DEFAULTS.chat),
        ...reasoningOptions,
      },
    },
    reasoning: "provider-default",
    outputSchema: lookupFindingsSchema,
    compaction: {
      thresholdPercent: 0.85,
    },
  });
}
