import type { EveAgentReducerEvent } from "eve/react";
import { chunkReasoning, chunkWords } from "./chunk.ts";
import { eventMeta } from "./event-meta.ts";

type MemoryCategory =
  | "work_context"
  | "personal_context"
  | "active_focus"
  | "instructions_preferences"
  | "project_history";

type ArtifactType = "case_study" | "report" | "summary" | "note";
type ArtifactStatus = "draft" | "review" | "published";
type ArtifactColour = "white" | "peach" | "green" | "lilac";

type BuilderState = {
  sequence: number;
  turnId: string;
  stepIndex: number;
  submissionId: string;
  sessionId: string;
  events: EveAgentReducerEvent[];
};

function createState(options?: {
  turnId?: string;
  submissionId?: string;
  sessionId?: string;
}): BuilderState {
  return {
    sequence: 0,
    turnId: options?.turnId ?? "mock-turn-1",
    stepIndex: 0,
    submissionId: options?.submissionId ?? "mock-submission-1",
    sessionId: options?.sessionId ?? "mock-session-1",
    events: [],
  };
}

function nextSequence(state: BuilderState): number {
  state.sequence += 1;
  return state.sequence;
}


export type ScenarioBuilder = {
  readonly events: EveAgentReducerEvent[];
  sessionStarted: () => ScenarioBuilder;
  userSubmitted: (message: string) => ScenarioBuilder;
  turnStarted: () => ScenarioBuilder;
  messageReceived: (message: string) => ScenarioBuilder;
  stepStarted: (modelId?: string) => ScenarioBuilder;
  streamReasoning: (text: string) => ScenarioBuilder;
  streamText: (text: string) => ScenarioBuilder;
  toolCall: (args: {
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
    callId?: string;
  }) => ScenarioBuilder;
  /** One `actions.requested` with many tools, then results in finish order. */
  toolBatch: (
    calls: readonly {
      toolName: string;
      input: Record<string, unknown>;
      output: unknown;
      callId?: string;
    }[],
  ) => ScenarioBuilder;
  subagentCall: (args: {
    name: string;
    task: string;
    result: string;
    callId?: string;
  }) => ScenarioBuilder;
  /** Dispatch several subagents at once; complete them in array order. */
  subagentBatch: (
    agents: readonly {
      name: string;
      task: string;
      result: string;
      callId?: string;
    }[],
  ) => ScenarioBuilder;
  artifactCall: (args: {
    title: string;
    contentMarkdown: string;
    type?: ArtifactType;
    status?: ArtifactStatus;
    colour?: ArtifactColour;
    id?: string;
    callId?: string;
  }) => ScenarioBuilder;
  saveMemory: (args: {
    reason: string;
    updates: { category: MemoryCategory; content: string }[];
    callId?: string;
    requestId?: string;
    /** When true, scenario ends at approval-requested (HITL pause). */
    pauseForApproval?: boolean;
    approvedOutput?: unknown;
  }) => ScenarioBuilder;
  turnCompleted: () => ScenarioBuilder;
  turnFailed: (message: string, code?: string) => ScenarioBuilder;
  sessionWaiting: () => ScenarioBuilder;
  /** Begin a new assistant step after tool results (multi-step turns). */
  nextStep: (modelId?: string) => ScenarioBuilder;
};

export function createScenarioBuilder(options?: {
  turnId?: string;
  submissionId?: string;
  sessionId?: string;
}): ScenarioBuilder {
  const state = createState(options);

  const builder: ScenarioBuilder = {
    get events() {
      return state.events;
    },

    sessionStarted() {
      state.events.push({
        type: "session.started",
        data: {},
        meta: eventMeta(),
      });
      return builder;
    },

    userSubmitted(message) {
      state.events.push({
        type: "client.message.submitted",
        data: {
          createdAt: Date.now(),
          message,
          submissionId: state.submissionId,
        },
      });
      return builder;
    },

    turnStarted() {
      state.events.push({
        type: "turn.started",
        data: {
          sequence: nextSequence(state),
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    messageReceived(message) {
      state.events.push({
        type: "message.received",
        data: {
          message,
          parts: [{ type: "text", text: message }],
          sequence: nextSequence(state),
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    stepStarted(modelId = "mock/chat-lab") {
      state.events.push({
        type: "step.started",
        data: {
          modelId,
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    streamReasoning(text) {
      let soFar = "";
      for (const delta of chunkReasoning(text)) {
        soFar += delta;
        state.events.push({
          type: "reasoning.appended",
          data: {
            reasoningDelta: delta,
            reasoningSoFar: soFar,
            sequence: nextSequence(state),
            stepIndex: state.stepIndex,
            turnId: state.turnId,
          },
          meta: eventMeta(),
        });
      }
      state.events.push({
        type: "reasoning.completed",
        data: {
          reasoning: soFar,
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    streamText(text) {
      let soFar = "";
      for (const delta of chunkWords(text)) {
        soFar += delta;
        state.events.push({
          type: "message.appended",
          data: {
            messageDelta: delta,
            messageSoFar: soFar,
            sequence: nextSequence(state),
            stepIndex: state.stepIndex,
            turnId: state.turnId,
          },
          meta: eventMeta(),
        });
      }
      state.events.push({
        type: "message.completed",
        data: {
          finishReason: "stop",
          message: soFar,
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    toolCall(args) {
      return builder.toolBatch([args]);
    },

    toolBatch(calls) {
      const prepared = calls.map((call, index) => ({
        ...call,
        callId: call.callId ?? `call-${call.toolName}-${state.sequence + index + 1}`,
      }));
      state.events.push({
        type: "actions.requested",
        data: {
          actions: prepared.map((call) => ({
            kind: "tool-call" as const,
            callId: call.callId,
            toolName: call.toolName,
            input: call.input as never,
          })),
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      for (const call of prepared) {
        state.events.push({
          type: "action.result",
          data: {
            status: "completed",
            result: {
              kind: "tool-result",
              callId: call.callId,
              toolName: call.toolName,
              output: call.output as never,
            },
            sequence: nextSequence(state),
            stepIndex: state.stepIndex,
            turnId: state.turnId,
          },
          meta: eventMeta(),
        });
      }
      return builder;
    },

    subagentCall(args) {
      return builder.subagentBatch([args]);
    },

    subagentBatch(agents) {
      const prepared = agents.map((agent, index) => ({
        ...agent,
        callId: agent.callId ?? `call-subagent-${state.sequence + index + 1}`,
      }));
      state.events.push({
        type: "actions.requested",
        data: {
          actions: prepared.map((agent) => ({
            kind: "subagent-call" as const,
            callId: agent.callId,
            name: "agent",
            nodeId: "agent",
            subagentName: agent.name,
            description: agent.task,
            input: { message: agent.task },
          })),
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      for (const agent of prepared) {
        state.events.push({
          type: "subagent.called",
          data: {
            callId: agent.callId,
            childSessionId: `${state.sessionId}-child-${agent.callId}`,
            childStreamPath: `/mock/subagent/${agent.callId}`,
            sessionId: state.sessionId,
            sequence: nextSequence(state),
            name: agent.name,
            toolName: "agent",
            turnId: state.turnId,
            workflowId: `wf-${agent.callId}`,
          },
          meta: eventMeta(),
        });
        state.events.push({
          type: "subagent.started",
          data: {
            callId: agent.callId,
            subagentName: agent.name,
          },
          meta: eventMeta(),
        });
      }
      for (const agent of prepared) {
        state.events.push({
          type: "subagent.completed",
          data: {
            callId: agent.callId,
            output: agent.result,
            subagentName: agent.name,
          },
          meta: eventMeta(),
        });
        state.events.push({
          type: "action.result",
          data: {
            status: "completed",
            result: {
              kind: "subagent-result",
              callId: agent.callId,
              origin: "dispatch",
              isError: true,
              output: agent.result,
              subagentName: agent.name,
            },
            sequence: nextSequence(state),
            stepIndex: state.stepIndex,
            turnId: state.turnId,
          },
          meta: eventMeta(),
        });
      }
      return builder;
    },

    artifactCall({
      title,
      contentMarkdown,
      type = "case_study",
      status = "draft",
      colour = "peach",
      id = "mock-artifact-1",
      callId,
    }) {
      const toolCallId = callId ?? `call-artifact-${state.sequence + 1}`;
      const preview = contentMarkdown.slice(0, 160);
      return builder.toolCall({
        toolName: "create_artifact",
        callId: toolCallId,
        input: {
          type,
          title,
          contentMarkdown,
        },
        output: {
          id,
          type,
          title,
          status,
          colour,
          preview,
        },
      });
    },

    saveMemory({
      reason,
      updates,
      callId,
      requestId,
      pauseForApproval = true,
      approvedOutput,
    }) {
      const id = callId ?? `call-memory-${state.sequence + 1}`;
      const reqId = requestId ?? `req-memory-${state.sequence + 1}`;
      const input = { reason, updates };

      state.events.push({
        type: "actions.requested",
        data: {
          actions: [
            {
              kind: "tool-call",
              callId: id,
              toolName: "save_memory",
              input,
            },
          ],
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });

      state.events.push({
        type: "input.requested",
        data: {
          requests: [
            {
              requestId: reqId,
              kind: "tool-approval",
              prompt: reason,
              display: "confirmation",
              action: {
                kind: "tool-call",
                callId: id,
                toolName: "save_memory",
                input,
              },
              options: [
                { id: "approve", label: "Approve", style: "primary" },
                { id: "deny", label: "Deny", style: "danger" },
              ],
            },
          ],
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });

      if (pauseForApproval) {
        return builder;
      }

      state.events.push({
        type: "client.input.responded",
        data: {
          createdAt: Date.now(),
          responses: [{ requestId: reqId, optionId: "approve" }],
        },
      });

      state.events.push({
        type: "action.result",
        data: {
          status: "completed",
          result: {
            kind: "tool-result",
            callId: id,
            toolName: "save_memory",
            output: (approvedOutput ?? { saved: true }) as never,
          },
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });

      return builder;
    },

    nextStep(modelId = "mock/chat-lab") {
      state.events.push({
        type: "step.completed",
        data: {
          finishReason: "tool-calls",
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      state.stepIndex += 1;
      return builder.stepStarted(modelId);
    },

    turnCompleted() {
      state.events.push({
        type: "step.completed",
        data: {
          finishReason: "stop",
          sequence: nextSequence(state),
          stepIndex: state.stepIndex,
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      state.events.push({
        type: "turn.completed",
        data: {
          sequence: nextSequence(state),
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    turnFailed(message, code = "mock_turn_failed") {
      state.events.push({
        type: "turn.failed",
        data: {
          code,
          message,
          sequence: nextSequence(state),
          turnId: state.turnId,
        },
        meta: eventMeta(),
      });
      return builder;
    },

    sessionWaiting() {
      state.events.push({
        type: "session.waiting",
        data: {
          continuationToken: state.sessionId,
          wait: "next-user-message",
        },
        meta: eventMeta(),
      });
      return builder;
    },
  };

  return builder;
}

/** Standard open: session → submit → turn → received → step. */
export function beginTurn(
  userMessage: string,
  options?: { turnId?: string; submissionId?: string; sessionId?: string },
): ScenarioBuilder {
  return createScenarioBuilder(options)
    .sessionStarted()
    .userSubmitted(userMessage)
    .turnStarted()
    .messageReceived(userMessage)
    .stepStarted();
}

/** Finish a successful turn. */
export function endTurn(builder: ScenarioBuilder): EveAgentReducerEvent[] {
  return builder.turnCompleted().sessionWaiting().events;
}
