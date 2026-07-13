import { defineAgent, defineDynamic } from "eve";
import {
  MODEL_DEFAULTS,
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
  modelOptions: {
    providerOptions: {
      gateway: fallbackGateway,
    },
  },
});
