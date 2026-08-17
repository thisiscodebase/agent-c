import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendThreadEventsState,
  DEFAULT_SLACK_THREAD_TITLE,
  extractSlackMessageContent,
  isSlackThreadId,
  slackThreadId,
  slackThreadTitleFromMessageText,
} from "./types/thread.ts";

describe("slack thread ids", () => {
  it("prefixes Eve session ids", () => {
    assert.equal(slackThreadId("sess_1"), "slack:sess_1");
    assert.equal(isSlackThreadId("slack:sess_1"), true);
    assert.equal(isSlackThreadId("a1b2c3d4-e5f6-7890-abcd-ef1234567890"), false);
  });
});

describe("extractSlackMessageContent", () => {
  it("reads the inner content block from Eve's slack_message envelope", () => {
    const raw = [
      "<slack_message>",
      "sender_type: user",
      "<content>",
      "Find the Alasdair case study",
      "</content>",
      "</slack_message>",
    ].join("\n");

    assert.equal(extractSlackMessageContent(raw), "Find the Alasdair case study");
    assert.equal(
      slackThreadTitleFromMessageText(raw),
      "Slack: Find the Alasdair case study",
    );
  });

  it("does not title from a bare <slack_message> first line", () => {
    assert.equal(extractSlackMessageContent("<slack_message>\n"), "");
    assert.equal(slackThreadTitleFromMessageText("<slack_message>"), undefined);
  });

  it("passes through plain text", () => {
    assert.equal(extractSlackMessageContent("hello"), "hello");
    assert.equal(slackThreadTitleFromMessageText("hello"), "Slack: hello");
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

  it("supports web source and never drops sessionId on empty append", () => {
    const started = {
      type: "session.started",
      meta: { id: "evt_s" },
      data: { runtime: { modelId: "openai/gpt-5.6-luna" } },
    };
    const once = appendThreadEventsState(
      null,
      [started],
      { sessionId: "sess_web" },
      "web",
    );
    const again = appendThreadEventsState(
      once,
      [],
      { sessionId: "sess_web" },
      "web",
    );

    assert.equal(once.source, "web");
    assert.equal(again.source, "web");
    assert.equal(again.session.sessionId, "sess_web");
    assert.equal(again.events.length, 1);
  });
});
