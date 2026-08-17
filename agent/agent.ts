import { defineAgent, defineDynamic } from "eve";
import {
  MODEL_DEFAULTS,
  contextWindowForModel,
  gatewayPrivacyOptions,
  reasoningProviderOptions,
} from "../shared/models.js";
import { isAppUserId } from "../shared/usage-meter.js";
import {
  fetchAgentModelSelection,
  selectionFromAuthAttributes,
} from "./lib/model-routing-internal.js";

async function resolveDynamicModel(
  _event: unknown,
  ctx: {
    session: {
      auth: {
        current?: {
          principalId?: string;
          attributes?: unknown;
        } | null;
      };
    };
  },
) {
  const principalId = ctx.session.auth.current?.principalId;
  const userId = isAppUserId(principalId) ? principalId : undefined;
  const fromAuth = selectionFromAuthAttributes(
    ctx.session.auth.current?.attributes,
  );
  const selection = await fetchAgentModelSelection(userId, fromAuth);
  const reasoningOptions = reasoningProviderOptions(
    selection.model,
    selection.reasoning,
  );

  return {
    model: selection.model,
    // Budget against the cheap pricing tier, not the model's full
    // capacity, so compaction fires before a thread crosses into
    // double-rate tokens (luna: 272k of a 1.05M window).
    modelContextWindowTokens: contextWindowForModel(selection.model),
    modelOptions: {
      providerOptions: {
        gateway: selection.gateway ?? gatewayPrivacyOptions(MODEL_DEFAULTS.chat),
        ...reasoningOptions,
      },
    },
  };
}

export default defineAgent({
  // Dynamic models have no compiled fallback (eve ≥0.33); resolvers must
  // always return a concrete selection.
  model: defineDynamic({
    events: {
      "session.started": resolveDynamicModel,
      "turn.started": resolveDynamicModel,
    },
  }),
  // Per-turn effort is applied via providerOptions from the dynamic
  // resolver (Eve's root `reasoning` field is not dynamic).
  reasoning: "provider-default",
  // Threads that fan out across connectors accumulate large tool results;
  // compacting earlier trades one summarisation call for a smaller resend on
  // every later turn.
  compaction: {
    thresholdPercent: 0.85,
  },
});
