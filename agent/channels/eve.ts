import type { AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { vercelOidc } from "eve/channels/auth";
import {
  DEFAULT_AGENT_PREFS,
  isAgentModeId,
  isAgentReasoningEffort,
} from "../../shared/agent-modes.js";
import { auth } from "../../auth";

/** Must match hooks/chat/use-chat-session.ts header names. */
const AGENT_MODE_HEADER = "x-agent-c-mode";
const AGENT_REASONING_HEADER = "x-agent-c-reasoning";

function appSession(): AuthFn<Request> {
  return async (request) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return null;
    }

    const modeHeader = request.headers.get(AGENT_MODE_HEADER);
    const reasoningHeader = request.headers.get(AGENT_REASONING_HEADER);

    return {
      attributes: {
        email: session.user.email,
        name: session.user.name,
        agentMode: isAgentModeId(modeHeader)
          ? modeHeader
          : DEFAULT_AGENT_PREFS.mode,
        agentReasoning: isAgentReasoningEffort(reasoningHeader)
          ? reasoningHeader
          : DEFAULT_AGENT_PREFS.reasoning,
      },
      authenticator: "app",
      issuer: "app",
      principalId: session.user.id,
      principalType: "user",
    };
  };
}

export default eveChannel({
  auth: [
    appSession(),
    vercelOidc(),
  ],
});
