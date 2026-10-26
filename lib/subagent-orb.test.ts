import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConversationAgentSession, EveAgentReducerEvent, EveMessage } from "eve/react";
import {
  activityFromFollowedSession,
  assignUniqueSubagentHues,
  orbStateForCategory,
  orbStateForSubagentTask,
  orbStateFromChildStreamEvent,
  reduceLiveSubagentOrbStates,
  subagentOrbHueRotate,
} from "./subagent-orb.ts";

describe("orbStateForCategory", () => {
  it("maps handoff, search, and shape categories", () => {
    assert.equal(orbStateForCategory("handoff"), "weaving");
    assert.equal(orbStateForCategory("slack"), "searching");
    assert.equal(orbStateForCategory("todos"), "shaping");
    assert.equal(orbStateForCategory("general"), "working");
  });
});

describe("orbStateForSubagentTask", () => {
  it("infers searching from research tasks", () => {
    assert.equal(
      orbStateForSubagentTask("Slack Scan", "Search Slack for Acme."),
      "searching",
    );
    assert.equal(
      orbStateForSubagentTask("Docs Research", "Read the latest QBR."),
      "searching",
    );
  });

  it("falls back to working when the task is generic", () => {
    assert.equal(orbStateForSubagentTask("Helper", "Do the thing."), "working");
  });
});

describe("subagentOrbHueRotate", () => {
  it("is stable per id and stays off the orange fruit hue", () => {
    assert.equal(subagentOrbHueRotate("call-a"), subagentOrbHueRotate("call-a"));
    const allowed = new Set([95, 135, 175, 210, 250, 290]);
    assert.ok(allowed.has(subagentOrbHueRotate("call-a")));
    assert.ok(allowed.has(subagentOrbHueRotate("docs-research")));
  });
});

describe("assignUniqueSubagentHues", () => {
  it("never repeats a hue while the palette has spare slots", () => {
    const ids = ["docs-research", "crm-research", "platform-research", "slack-scan"];
    const hues = [...assignUniqueSubagentHues(ids).values()];
    assert.equal(new Set(hues).size, ids.length);
  });

  it("keeps a live id's hue when a sibling joins", () => {
    const first = assignUniqueSubagentHues(["docs-research"]);
    const next = assignUniqueSubagentHues(
      ["docs-research", "slack-scan"],
      first,
    );
    assert.equal(next.get("docs-research"), first.get("docs-research"));
    assert.notEqual(next.get("slack-scan"), next.get("docs-research"));
  });
});

describe("orbStateFromChildStreamEvent", () => {
  const meta = { id: "evt", at: "2020-01-01T00:00:00.000Z" };

  it("maps nested reasoning, tools, and text to orb verbs", () => {
    assert.equal(
      orbStateFromChildStreamEvent({
        type: "reasoning.appended",
        data: {
          reasoningDelta: "x",
          sequence: 1,
          stepIndex: 0,
          turnId: "t",
        },
        meta,
      }),
      "solving",
    );
    assert.equal(
      orbStateFromChildStreamEvent({
        type: "actions.requested",
        data: {
          actions: [
            {
              kind: "tool-call",
              callId: "c1",
              toolName: "search_slack",
              input: { query: "Acme" },
            },
          ],
          sequence: 1,
          stepIndex: 0,
          turnId: "t",
        },
        meta,
      }),
      "searching",
    );
    assert.equal(
      orbStateFromChildStreamEvent({
        type: "message.appended",
        data: {
          messageDelta: "ok",
          sequence: 1,
          stepIndex: 0,
          turnId: "t",
        },
        meta,
      }),
      "composing",
    );
  });
});

describe("reduceLiveSubagentOrbStates", () => {
  it("clears tracked calls when the parent turn ends", () => {
    const events: EveAgentReducerEvent[] = [
      {
        type: "task.started",
        data: {
          callId: "call-docs",
          kind: "agent",
          name: "researcher",
          taskId: "task-docs",
          turnId: "t",
        },
        meta: { id: "1", at: "2020-01-01T00:00:00.000Z" },
      },
      {
        type: "task.settled",
        data: {
          callId: "call-docs",
          kind: "agent",
          name: "researcher",
          output: "done",
          status: "completed",
          taskId: "task-docs",
          turnId: "t",
        },
        meta: { id: "2", at: "2020-01-01T00:00:00.000Z" },
      },
      {
        type: "turn.completed",
        data: {
          sequence: 3,
          turnId: "t",
        },
        meta: { id: "3", at: "2020-01-01T00:00:00.000Z" },
      },
    ];

    assert.equal(reduceLiveSubagentOrbStates(events.slice(0, 2)).size, 0);
    assert.equal(reduceLiveSubagentOrbStates(events).size, 0);
  });
});

function followedSession(messages: readonly EveMessage[]): ConversationAgentSession {
  return {
    sessionId: "child",
    name: "researcher",
    callId: "call-1",
    turnId: "t",
    observation: {
      status: "following",
      conversation: {
        messages,
        turns: {},
        inputs: {},
        tasks: {},
        agents: {},
      },
    },
  };
}

describe("activityFromFollowedSession", () => {
  it("prefers an active child tool over streaming reasoning", () => {
    const activity = activityFromFollowedSession(followedSession([
      {
        id: "a",
        role: "assistant",
        parts: [
          { type: "reasoning", text: "Looking…", state: "streaming" },
          {
            type: "dynamic-tool",
            toolCallId: "tool-1",
            toolName: "search_slack",
            state: "input-available",
            input: { query: "acme" },
          },
        ],
      },
    ]));
    assert.equal(activity?.orb, "searching");
    assert.equal(activity?.toolLabel, "Searching Slack for “acme”");
  });

  it("returns undefined until the child is followed", () => {
    const session = followedSession([]);
    assert.equal(
      activityFromFollowedSession({
        ...session,
        observation: { status: "not-followed" },
      }),
      undefined,
    );
  });
});
