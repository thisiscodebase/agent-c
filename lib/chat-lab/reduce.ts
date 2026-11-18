import type { EveMessage, EveMessagePart, EveToolPart } from "eve/react";
import { reconcileEventLog } from "./reconcile.ts";
import type { ChatLabEvent } from "./types.ts";

type MutableMessage = {
  id: string;
  role: "assistant" | "user";
  metadata?: EveMessage["metadata"];
  parts: EveMessagePart[];
};

function textPart(text: string, state: "done" | "streaming"): EveMessagePart {
  return { type: "text", text, state };
}

function toolPart(input: {
  callId: string;
  name: string;
  kind: EveToolPart["kind"];
  state: Exclude<EveToolPart["state"], "streaming">;
  input?: unknown;
  output?: unknown;
  interaction?: EveToolPart["interaction"];
}): EveToolPart {
  return {
    type: "tool",
    callId: input.callId,
    stepIndex: 0,
    kind: input.kind,
    name: input.name,
    label: input.name,
    state: input.state,
    input: input.input,
    ...(input.output !== undefined ? { output: input.output } : {}),
    ...(input.interaction ? { interaction: input.interaction } : {}),
  };
}

function upsertPart(
  message: MutableMessage,
  match: (part: EveMessagePart) => boolean,
  next: EveMessagePart,
) {
  const index = message.parts.findIndex(match);
  if (index >= 0) message.parts[index] = next;
  else message.parts.push(next);
}

/** Project a scripted lab log into the eve 1.0 message shape the chat UI renders. */
export function reduceEventPrefix(
  events: readonly ChatLabEvent[],
): { messages: EveMessage[] } {
  const messages: MutableMessage[] = [];
  let assistant: MutableMessage | undefined;

  const ensureAssistant = () => {
    if (!assistant || assistant.metadata?.status === "complete") {
      assistant = {
        id: `assistant-${messages.length + 1}`,
        role: "assistant",
        metadata: { status: "streaming" },
        parts: [],
      };
      messages.push(assistant);
    }
    return assistant;
  };

  const findTool = (callId: string) => {
    for (const message of messages) {
      const part = message.parts.find(
        (entry): entry is EveToolPart => entry.type === "tool" && entry.callId === callId,
      );
      if (part && part.state !== "streaming") return part;
    }
    return undefined;
  };

  for (const event of reconcileEventLog(events)) {
    const data = event.data ?? {};
    switch (event.type) {
      case "client.message.submitted":
      case "message.received": {
        const text = typeof data.message === "string" ? data.message : "";
        const optimistic = event.type === "client.message.submitted";
        const existing = optimistic
          ? undefined
          : messages.find((message) => message.role === "user" && message.metadata?.optimistic);
        const user: MutableMessage = {
          id: typeof data.submissionId === "string" ? data.submissionId : `user-${messages.length + 1}`,
          role: "user",
          metadata: optimistic
            ? { status: "submitted", optimistic: true }
            : { status: "complete" },
          parts: [textPart(text, "done")],
        };
        if (existing) messages[messages.indexOf(existing)] = user;
        else messages.push(user);
        break;
      }
      case "reasoning.appended":
      case "reasoning.completed": {
        const current = ensureAssistant();
        const previous = current.parts.find((part) => part.type === "reasoning");
        const soFar = previous?.type === "reasoning" ? previous.text : "";
        const text = event.type === "reasoning.completed"
          ? String(data.reasoning ?? soFar)
          : soFar + String(data.reasoningDelta ?? "");
        upsertPart(
          current,
          (part) => part.type === "reasoning",
          {
            type: "reasoning",
            text,
            state: event.type === "reasoning.completed" ? "done" : "streaming",
          },
        );
        break;
      }
      case "message.appended":
      case "message.completed": {
        const current = ensureAssistant();
        const previous = [...current.parts].reverse().find((part) => part.type === "text");
        const soFar = previous?.type === "text" ? previous.text : "";
        const text = event.type === "message.completed"
          ? String(data.message ?? soFar)
          : soFar + String(data.messageDelta ?? "");
        upsertPart(
          current,
          (part) => part.type === "text",
          textPart(text, event.type === "message.completed" ? "done" : "streaming"),
        );
        break;
      }
      case "actions.requested": {
        const current = ensureAssistant();
        const actions = Array.isArray(data.actions) ? data.actions : [];
        for (const action of actions) {
          if (!action || typeof action !== "object") continue;
          const row = action as {
            kind?: string;
            callId?: string;
            toolName?: string;
            subagentName?: string;
            input?: unknown;
          };
          const callId = row.callId ?? `call-${current.parts.length + 1}`;
          const name = row.kind === "subagent-call"
            ? (row.subagentName ?? "agent")
            : (row.toolName ?? "tool");
          current.parts.push(toolPart({
            callId,
            name,
            kind: row.kind === "subagent-call" ? "agent" : "tool",
            state: "running",
            input: row.input,
          }));
        }
        break;
      }
      case "action.result": {
        const result = data.result as { callId?: string; output?: unknown; toolName?: string } | undefined;
        const callId = result?.callId;
        const part = callId ? findTool(callId) : undefined;
        if (part) {
          Object.assign(part, { state: "completed", output: result?.output, input: part.input });
        }
        break;
      }
      case "task.settled": {
        const callId = typeof data.callId === "string" ? data.callId : undefined;
        const part = callId ? findTool(callId) : undefined;
        if (part) {
          Object.assign(part, { state: "completed", output: data.output });
        }
        break;
      }
      case "input.requested": {
        const requests = Array.isArray(data.requests) ? data.requests : [];
        const request = requests[0] as {
          requestId?: string;
          prompt?: string;
          display?: "confirmation" | "select" | "text";
          options?: ReadonlyArray<{ id: string; label: string; description?: string; style?: "primary" | "danger" | "default" }>;
          action?: { callId?: string };
        } | undefined;
        const callId = request?.action?.callId;
        const part = callId ? findTool(callId) : undefined;
        if (part && request?.requestId) {
          const input = part.input;
          Object.assign(part, {
            state: "approval",
            input,
            interaction: {
              interactionId: request.requestId,
              turnId: typeof data.turnId === "string" ? data.turnId : "turn",
              stepIndex: 0,
              status: "open",
              request: {
                kind: "approval",
                prompt: request.prompt ?? "",
                display: request.display ?? "confirmation",
                options: request.options,
              },
              call: { callId, name: part.name },
            },
          });
        }
        break;
      }
      case "turn.completed":
      case "turn.failed":
      case "session.waiting":
      case "session.completed":
        if (assistant && assistant.metadata?.status === "streaming") {
          assistant.metadata = { ...assistant.metadata, status: "complete" };
          assistant = undefined;
        }
        break;
      default:
        break;
    }
  }

  return { messages };
}

export function messagesAtIndex(
  events: readonly ChatLabEvent[],
  index: number,
): readonly EveMessage[] {
  const clamped = Math.max(0, Math.min(index, events.length));
  return reduceEventPrefix(events.slice(0, clamped)).messages;
}
