import { chunkWords } from "../chunk.ts";
import { beginTurn, createScenarioBuilder } from "../dsl.ts";
import { eventMeta } from "../event-meta.ts";
import type { ChatLabScenario } from "../types.ts";

const userMessage = "Remember that I prefer concise answers with bullet points.";
const callId = "call-memory-1";
const requestId = "req-memory-1";
const turnId = "mock-turn-1";

function continuationAfterDecision(approved: boolean) {
  const builder = createScenarioBuilder({ turnId });
  // Sequence numbers only need to be unique within the continuation segment;
  // the reducer keys tools by callId.
  const events = builder.events;

  let sequence = 100;
  const next = () => {
    sequence += 1;
    return sequence;
  };

  if (approved) {
    events.push({
      type: "action.result",
      data: {
        status: "completed",
        result: {
          kind: "tool-result",
          callId,
          toolName: "save_memory",
          output: { saved: true },
        },
        sequence: next(),
        stepIndex: 0,
        turnId,
      },
      meta: eventMeta(),
    });
  }
  else {
    events.push({
      type: "action.result",
      data: {
        status: "rejected",
        result: {
          kind: "tool-result",
          callId,
          toolName: "save_memory",
          output: { saved: false },
          isError: true,
        },
        sequence: next(),
        stepIndex: 0,
        turnId,
      },
      meta: eventMeta(),
    });
  }

  events.push({
    type: "step.completed",
    data: {
      finishReason: "tool-calls",
      sequence: next(),
      stepIndex: 0,
      turnId,
    },
    meta: eventMeta(),
  });
  events.push({
    type: "step.started",
    data: {
      modelId: "mock/chat-lab",
      sequence: next(),
      stepIndex: 1,
      turnId,
    },
    meta: eventMeta(),
  });

  const text = approved
    ? "Saved. I’ll keep answers concise and use bullet points when it helps."
    : "Okay — I won’t save that preference. Ask again if you want it stored later.";

  let soFar = "";
  for (const delta of chunkWords(text)) {
    if (!delta) continue;
    soFar += delta;
    events.push({
      type: "message.appended",
      data: {
        messageDelta: delta,
        messageSoFar: soFar,
        sequence: next(),
        stepIndex: 1,
        turnId,
      },
      meta: eventMeta(),
    });
  }
  events.push({
    type: "message.completed",
    data: {
      finishReason: "stop",
      message: soFar,
      sequence: next(),
      stepIndex: 1,
      turnId,
    },
    meta: eventMeta(),
  });
  events.push({
    type: "step.completed",
    data: {
      finishReason: "stop",
      sequence: next(),
      stepIndex: 1,
      turnId,
    },
    meta: eventMeta(),
  });
  events.push({
    type: "turn.completed",
    data: {
      sequence: next(),
      turnId,
    },
    meta: eventMeta(),
  });
  events.push({
    type: "session.waiting",
    data: {
      continuationToken: "mock-session-1",
      wait: "next-user-message",
    },
    meta: eventMeta(),
  });

  return events;
}

/**
 * Ends at HITL approval. Playback auto-pauses; Approve/Deny continues via
 * afterHitlApprove / afterHitlDeny.
 */
export const hitlMemoryScenario: ChatLabScenario = {
  id: "hitl-memory",
  label: "HITL memory",
  description: "save_memory approval card — play pauses until you respond",
  userMessage,
  events: beginTurn(userMessage, { turnId })
    .streamReasoning("## Saving preference\nThis looks like a lasting instruction, so I’ll ask before writing it to memory.")
    .saveMemory({
      reason: "You asked me to remember a response-style preference.",
      updates: [
        {
          category: "instructions_preferences",
          content: "Prefer concise answers with bullet points.",
        },
      ],
      pauseForApproval: true,
      callId,
      requestId,
    }).events,
  afterHitlApprove: continuationAfterDecision(true),
  afterHitlDeny: continuationAfterDecision(false),
};
