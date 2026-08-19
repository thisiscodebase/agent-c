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


type SubagentChildEvent = Extract<
  EveAgentReducerEvent,
  { type: "subagent.event" }
>["data"]["event"];

type SubagentInnerBeat =
  | { kind: "reason"; text: string }
  | {
      kind: "tool";
      toolName: string;
      input: Record<string, unknown>;
      output: unknown;
    }
  | { kind: "write"; text: string };

function defaultSubagentInnerBeats(name: string): SubagentInnerBeat[] {
  if (name.includes("docs")) {
    return [
      {
        kind: "tool",
        toolName: "search_drive",
        input: { query: "Acme QBR" },
        output: { files: [{ name: "Acme QBR notes.docx" }] },
      },
      {
        kind: "tool",
        toolName: "notion__search",
        input: { query: "Acme coverage" },
        output: { pages: [{ title: "Acme Q1 brief" }] },
      },
      { kind: "write", text: "QBR is current; March coverage is the open risk." },
    ];
  }
  if (name.includes("crm")) {
    return [
      { kind: "reason", text: "Need company stage, owner, and latest deal activity." },
      {
        kind: "tool",
        toolName: "hubspot__search_crm",
        input: { query: "Acme", object: "companies" },
        output: { results: [{ name: "Acme Corp", owner: "Sam Rivera" }] },
      },
      { kind: "write", text: "Customer stage, Sam Rivera, Thursday renewal." },
    ];
  }
  if (name.includes("platform")) {
    return [
      { kind: "reason", text: "Check this week’s bookings and pairing gaps." },
      {
        kind: "tool",
        toolName: "platform__list_sessions",
        input: { company: "Acme", week: "this" },
        output: { booked: 6, pending: 2 },
      },
      { kind: "write", text: "6 booked, 2 pending; pairing gap opens in March." },
    ];
  }
  if (name.includes("slack")) {
    return [
      {
        kind: "tool",
        toolName: "search_slack",
        input: { query: "Acme renewal after:2026-01-01" },
        output: { matches: [{ channel: "#accounts", text: "Thursday still on" }] },
      },
      { kind: "reason", text: "Accounts agrees; mentors still thin for March." },
      { kind: "write", text: "Thursday call on; March backups unconfirmed." },
    ];
  }
  if (name.includes("research")) {
    return [
      { kind: "reason", text: "Need Platform, CRM, and coverage notes in one pass." },
      {
        kind: "tool",
        toolName: "hubspot__search_crm_objects",
        input: { query: "Acme", objectType: "COMPANY" },
        output: { results: [{ name: "Acme Corp", owner: "Sam Rivera" }] },
      },
      {
        kind: "tool",
        toolName: "platform__search_companies",
        input: { q: "Acme" },
        output: { booked: 6, pending: 2 },
      },
      {
        kind: "tool",
        toolName: "search_drive",
        input: { query: "Acme QBR" },
        output: { files: [{ name: "Acme QBR notes.docx" }] },
      },
      {
        kind: "tool",
        toolName: "get_company_profile",
        input: { company_number: "SC123456" },
        output: {
          company_number: "SC123456",
          company_name: "ACME ROBOTICS LTD",
          company_status: "active",
          url: "https://find-and-update.company-information.service.gov.uk/company/SC123456",
        },
      },
      { kind: "write", text: "Customer stage, Thursday renewal; March coverage is thin." },
    ];
  }
  return [
    { kind: "reason", text: "Working the assigned task." },
    { kind: "write", text: "Done." },
  ];
}

function pushSubagentChildEvent(
  state: BuilderState,
  agent: { callId: string; name: string },
  event: SubagentChildEvent,
) {
  state.events.push({
    type: "subagent.event",
    data: {
      callId: agent.callId,
      event,
      subagentName: agent.name,
    },
    meta: eventMeta(),
  });
}

function emitSubagentInnerBeat(
  state: BuilderState,
  agent: { callId: string; name: string },
  beat: SubagentInnerBeat,
  beatIndex: number,
) {
  const turnId = `${state.turnId}-child-${agent.callId}`;
  const childFields = {
    sequence: nextSequence(state),
    stepIndex: 0,
    turnId,
  };

  switch (beat.kind) {
    case "reason":
      pushSubagentChildEvent(state, agent, {
        type: "reasoning.appended",
        data: {
          reasoningDelta: beat.text,
          reasoningSoFar: beat.text,
          ...childFields,
        },
      });
      pushSubagentChildEvent(state, agent, {
        type: "reasoning.completed",
        data: {
          reasoning: beat.text,
          sequence: nextSequence(state),
          stepIndex: 0,
          turnId,
        },
      });
      return;
    case "tool": {
      const innerCallId = `${agent.callId}-inner-${beatIndex}`;
      pushSubagentChildEvent(state, agent, {
        type: "actions.requested",
        data: {
          actions: [
            {
              kind: "tool-call" as const,
              callId: innerCallId,
              toolName: beat.toolName,
              input: beat.input as never,
            },
          ],
          ...childFields,
        },
      });
      pushSubagentChildEvent(state, agent, {
        type: "action.result",
        data: {
          status: "completed",
          result: {
            kind: "tool-result",
            callId: innerCallId,
            toolName: beat.toolName,
            output: beat.output as never,
          },
          sequence: nextSequence(state),
          stepIndex: 0,
          turnId,
        },
      });
      return;
    }
    case "write":
      pushSubagentChildEvent(state, agent, {
        type: "message.appended",
        data: {
          messageDelta: beat.text,
          messageSoFar: beat.text,
          ...childFields,
        },
      });
      pushSubagentChildEvent(state, agent, {
        type: "message.completed",
        data: {
          finishReason: "stop",
          message: beat.text,
          sequence: nextSequence(state),
          stepIndex: 0,
          turnId,
        },
      });
      return;
    default: {
      const _never: never = beat;
      return _never;
    }
  }
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
    innerBeats?: readonly SubagentInnerBeat[];
  }) => ScenarioBuilder;
  /** Dispatch several subagents at once; complete them in array order. */
  subagentBatch: (
    agents: readonly {
      name: string;
      task: string;
      result: string;
      callId?: string;
      innerBeats?: readonly SubagentInnerBeat[];
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
      const innerQueues = prepared.map((agent) => ({
        agent,
        beats: [...(agent.innerBeats ?? defaultSubagentInnerBeats(agent.name))],
      }));
      let beatIndex = 0;
      while (innerQueues.some((queue) => queue.beats.length > 0)) {
        for (const queue of innerQueues) {
          const beat = queue.beats.shift();
          if (!beat) continue;
          emitSubagentInnerBeat(state, queue.agent, beat, beatIndex);
          beatIndex += 1;
        }
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
