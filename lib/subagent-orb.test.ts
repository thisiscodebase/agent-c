import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EveAgentReducerEvent } from "eve/react";
import {
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
  it("maps nested reasoning, tools, and text to orb verbs", () => {
    assert.equal(
      orbStateFromChildStreamEvent({
        type: "reasoning.appended",
        data: {
          reasoningDelta: "x",
          reasoningSoFar: "x",
          sequence: 1,
          stepIndex: 0,
          turnId: "t",
        },
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
      }),
      "searching",
    );
    assert.equal(
      orbStateFromChildStreamEvent({
        type: "message.appended",
        data: {
          messageDelta: "ok",
          messageSoFar: "ok",
          sequence: 1,
          stepIndex: 0,
          turnId: "t",
        },
      }),
      "composing",
    );
  });
});

describe("reduceLiveSubagentOrbStates", () => {
  it("tracks the latest inner verb and drops completed calls", () => {
    const events: EveAgentReducerEvent[] = [
      {
        type: "subagent.event",
        data: {
          callId: "call-docs",
          subagentName: "docs-research",
          event: {
            type: "reasoning.appended",
            data: {
              reasoningDelta: "x",
              reasoningSoFar: "x",
              sequence: 1,
              stepIndex: 0,
              turnId: "t",
            },
          },
        },
        meta: { id: "1", at: "2020-01-01T00:00:00.000Z" },
      },
      {
        type: "subagent.event",
        data: {
          callId: "call-docs",
          subagentName: "docs-research",
          event: {
            type: "actions.requested",
            data: {
              actions: [
                {
                  kind: "tool-call",
                  callId: "inner-1",
                  toolName: "search_drive",
                  input: { query: "Acme" },
                },
              ],
              sequence: 2,
              stepIndex: 0,
              turnId: "t",
            },
          },
        },
        meta: { id: "2", at: "2020-01-01T00:00:00.000Z" },
      },
      {
        type: "subagent.completed",
        data: {
          callId: "call-docs",
          output: "done",
          subagentName: "docs-research",
        },
        meta: { id: "3", at: "2020-01-01T00:00:00.000Z" },
      },
    ];

    const mid = reduceLiveSubagentOrbStates(events.slice(0, 2));
    assert.equal(mid.get("call-docs"), "searching");

    const done = reduceLiveSubagentOrbStates(events);
    assert.equal(done.size, 0);
  });
});
