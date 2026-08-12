/**
 * Client-only user bubbles shown before Eve confirms `client.message.submitted`.
 * Shape is a subset of Eve's `EveMessage` so the chat UI can render it as-is.
 */

export type OptimisticUserMessage = {
  id: string;
  role: "user";
  metadata: {
    optimistic: true;
    status: "submitted";
  };
  parts: readonly [
    {
      type: "text";
      text: string;
      state: "done";
    },
  ];
};

type TextBearingPart = {
  type: string;
  text?: string;
};

type TextBearingMessage = {
  role: string;
  parts: readonly TextBearingPart[];
};

export function createOptimisticUserMessage(
  text: string,
  id = "optimistic-user",
): OptimisticUserMessage {
  return {
    id,
    role: "user",
    metadata: { optimistic: true, status: "submitted" },
    parts: [{ type: "text", text, state: "done" }],
  };
}

export function userMessageText(message: TextBearingMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}

/** Empty assistant shells Eve inserts before the first visible part. */
function isPlaceholderAssistant(message: TextBearingMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }

  return !message.parts.some((part) => {
    if (part.type === "step-start") return false;
    if (part.type === "text" || part.type === "reasoning") {
      return Boolean(part.text?.trim());
    }
    return true;
  });
}

function lastSettledMessage<T extends TextBearingMessage>(
  messages: readonly T[],
): T | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || isPlaceholderAssistant(message)) {
      continue;
    }
    return message;
  }
  return undefined;
}

/**
 * Append `pending` unless that user turn is already in the list.
 * Trailing empty assistant shells are ignored so Eve's in-flight placeholder
 * does not look like a completed turn.
 */
export function mergeOptimisticUserMessage<T extends TextBearingMessage>(
  messages: readonly T[],
  pending: T | null | undefined,
): T[] {
  if (!pending) {
    return [...messages];
  }

  const pendingText = userMessageText(pending);
  if (!pendingText) {
    return [...messages];
  }

  const last = lastSettledMessage(messages);
  if (last?.role === "user" && userMessageText(last) === pendingText) {
    return [...messages];
  }

  return [...messages, pending];
}

/** True once Eve (or the reducer) already has this user text in the thread. */
export function hasUserMessageText(
  messages: readonly TextBearingMessage[],
  text: string,
): boolean {
  return messages.some(
    (message) => message.role === "user" && userMessageText(message) === text,
  );
}
