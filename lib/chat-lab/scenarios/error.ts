import { beginTurn } from "../dsl.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage = "What's blocking the Acme renewal?";

export const errorScenario: ChatLabScenario = {
  id: "error",
  label: "Turn error",
  description: "turn.failed mid-stream for banner + composer recovery",
  userMessage,
  events: beginTurn(userMessage)
    .streamReasoning(
      "## Looking up renewal\nChecking HubSpot for the deal stage and Slack for the last internal thread before I answer.",
    )
    .turnFailed("Upstream model timed out while calling HubSpot.", "gateway_timeout")
    .sessionWaiting().events,
};
