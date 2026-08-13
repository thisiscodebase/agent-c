import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendThreadEventsState,
  DEFAULT_SLACK_THREAD_TITLE,
  isSlackThreadId,
  slackThreadId,
} from "./types/thread.ts";

describe("slack thread ids", () => {
  it("prefixes Eve session ids", () => {
    assert.equal(slackThreadId("sess_1"), "slack:sess_1");
    assert.equal(isSlackThreadId("slack:sess_1"), true);
    assert.equal(isSlackThreadId("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), false);
  });
});

describe("appendThreadEventsState", () => {
  it("dedupes by meta.id and keeps source", () => {
    const first = { type: "turn.started", meta: { id: "evt_1" } };
    const step = {
      type: "step.completed",
      meta: { id: "evt_2" },
      data: { usage: { inputTokens: 10, outputTokens: 4 } },
    };

    const once = appendThreadEventsState(null, [first, step], { sessionId: "s1" }, "slack");
    const again = appendThreadEventsState(once, [step], { sessionId: "s1" }, "slack");

    assert.equal(once.source, "slack");
    assert.equal(again.events.length, 2);
    assert.equal(again.session.sessionId, "s1");
    assert.equal(DEFAULT_SLACK_THREAD_TITLE, "Slack");
  });
});
