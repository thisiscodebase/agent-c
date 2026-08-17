import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidWebThreadId,
  resolvePersistTarget,
  shouldPersistEvent,
  slackPlaceholderTitle,
  titleFromSlackMessageEvent,
} from "./thread-persist-policy.ts";

describe("shouldPersistEvent", () => {
  it("skips high-frequency deltas for both channels", () => {
    assert.equal(shouldPersistEvent("message.appended", "web"), false);
    assert.equal(shouldPersistEvent("reasoning.appended", "slack"), false);
  });

  it("persists the full non-delta stream for web", () => {
    assert.equal(shouldPersistEvent("message.completed", "web"), true);
    assert.equal(shouldPersistEvent("action.result", "web"), true);
    assert.equal(shouldPersistEvent("session.waiting", "web"), true);
  });

  it("only persists the Slack stats allowlist", () => {
    assert.equal(shouldPersistEvent("step.started", "slack"), true);
    assert.equal(shouldPersistEvent("step.completed", "slack"), true);
    assert.equal(shouldPersistEvent("message.completed", "slack"), false);
    assert.equal(shouldPersistEvent("action.result", "slack"), false);
  });
});

describe("resolvePersistTarget", () => {
  it("maps Slack channels to slack:{sessionId}", () => {
    assert.deepEqual(
      resolvePersistTarget({ channelKind: "slack", sessionId: "sess_abc" }),
      { source: "slack", threadId: "slack:sess_abc" },
    );
    assert.deepEqual(
      resolvePersistTarget({
        channelKind: "http",
        sessionId: "sess_abc",
        attributes: { linked: "true", slack_user_id: "U123" },
      }),
      { source: "slack", threadId: "slack:sess_abc" },
    );
  });

  it("requires a UUID threadId attribute for web", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    assert.deepEqual(
      resolvePersistTarget({
        channelKind: "eve",
        sessionId: "sess_1",
        attributes: { threadId: uuid },
      }),
      { source: "web", threadId: uuid },
    );
    assert.equal(
      resolvePersistTarget({
        channelKind: "eve",
        sessionId: "sess_1",
        attributes: { threadId: "not-a-uuid" },
      }),
      null,
    );
    assert.equal(
      resolvePersistTarget({ channelKind: "eve", sessionId: "sess_1" }),
      null,
    );
  });
});

describe("isValidWebThreadId", () => {
  it("accepts UUID v4-shaped ids", () => {
    assert.equal(isValidWebThreadId("a1b2c3d4-e5f6-4890-abcd-ef1234567890"), true);
    assert.equal(isValidWebThreadId("slack:sess"), false);
  });
});

describe("Slack persist titles", () => {
  it("uses Slack · name placeholders", () => {
    assert.equal(slackPlaceholderTitle(null), "Slack");
    assert.equal(
      slackPlaceholderTitle({ slack_user_name: "vertika" }),
      "Slack · vertika",
    );
  });

  it("titles message.received from envelope content", () => {
    const raw = [
      "<slack_message>",
      "<content>",
      "Ship the case study",
      "</content>",
      "</slack_message>",
    ].join("\n");
    assert.equal(
      titleFromSlackMessageEvent({
        eventType: "message.received",
        messageText: raw,
      }),
      "Slack: Ship the case study",
    );
    assert.equal(
      titleFromSlackMessageEvent({ eventType: "turn.started" }),
      "Slack",
    );
  });
});
