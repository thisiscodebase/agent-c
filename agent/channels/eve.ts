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
const AGENT_THREAD_ID_HEADER = "x-agent-c-thread-id";

const THREAD_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const threadIdHeader = request.headers.get(AGENT_THREAD_ID_HEADER)?.trim();
    const threadId =
      threadIdHeader && THREAD_ID_UUID_RE.test(threadIdHeader)
        ? threadIdHeader
        : undefined;

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
        ...(threadId ? { threadId } : {}),
      },
      authenticator: "app",
      issuer: "app",
      principalId: session.user.id,
      principalType: "user",
    };
  };
}

export default eveChannel({
  // Preserve pre-0.33 wait-for-completion behavior for follow-ups while a
  // turn is active (default is now "steer", which cancels the in-flight turn).
  turnPolicy: "queue",
  auth: [
    appSession(),
    vercelOidc(),
  ],
});
