import { defineAgent, defineDynamic } from "eve";
import {
  MODEL_DEFAULTS,
  contextWindowForModel,
  gatewayPrivacyOptions,
} from "../shared/models.js";
import { fetchAgentModelSelection } from "./lib/model-routing-internal.js";

const fallbackGateway = gatewayPrivacyOptions(MODEL_DEFAULTS.chat);

export default defineAgent({
  model: defineDynamic({
    fallback: MODEL_DEFAULTS.chat,
    events: {
      "session.started": async (_event, ctx) => {
        const principalId = ctx.session.auth.current?.principalId;
        const userId =
          principalId && !principalId.startsWith("eve:") ? principalId : undefined;
        const selection = await fetchAgentModelSelection(userId);

        return {
          model: selection.model,
          // Budget against the cheap pricing tier, not the model's full
          // capacity, so compaction fires before a thread crosses into
          // double-rate tokens (luna: 272k of a 1.05M window).
          modelContextWindowTokens: contextWindowForModel(selection.model),
          modelOptions: {
            providerOptions: {
              gateway: selection.gateway,
            },
          },
        };
      },
    },
  }),
  reasoning: "high",
  // Threads that fan out across connectors accumulate large tool results;
  // compacting earlier trades one summarisation call for a smaller resend on
  // every later turn.
  compaction: {
    thresholdPercent: 0.85,
  },
  modelOptions: {
    providerOptions: {
      gateway: fallbackGateway,
    },
  },
});
