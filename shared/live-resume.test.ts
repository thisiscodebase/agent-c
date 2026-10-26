import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendUniqueStreamEvent,
  getOpenTurnId,
  isTurnBoundaryEvent,
  mergeStreamEventLogs,
  streamEventId,
} from "./live-resume.ts";

function event(type: string, id: string, turnId?: string) {
  return {
    type,
    meta: { id },
    ...(turnId ? { data: { turnId } } : {}),
  };
}

describe("isTurnBoundaryEvent", () => {
  it("matches Eve's current-turn boundary types", () => {
    assert.equal(isTurnBoundaryEvent({ type: "session.waiting" }), true);
    assert.equal(isTurnBoundaryEvent({ type: "session.completed" }), true);
    assert.equal(isTurnBoundaryEvent({ type: "session.failed" }), true);
    assert.equal(isTurnBoundaryEvent({ type: "turn.completed" }), false);
    assert.equal(isTurnBoundaryEvent({ type: "message.completed" }), false);
  });
});

describe("streamEventId / appendUniqueStreamEvent", () => {
  it("reads meta.id and skips duplicates", () => {
    assert.equal(streamEventId(event("turn.started", "evt_1")), "evt_1");
    assert.equal(streamEventId({ type: "turn.started" }), null);

    const once = [event("turn.started", "evt_1")];
    assert.equal(appendUniqueStreamEvent(once, event("turn.started", "evt_1")).length, 1);
    assert.equal(appendUniqueStreamEvent(once, event("step.started", "evt_2")).length, 2);
  });
});

describe("getOpenTurnId", () => {
  it("returns the latest turn.started until a boundary", () => {
    assert.equal(getOpenTurnId([]), undefined);
    assert.equal(
      getOpenTurnId([
        event("session.started", "a"),
        event("turn.started", "b", "turn_1"),
        event("message.completed", "c"),
      ]),
      "turn_1",
    );
    assert.equal(
      getOpenTurnId([
        event("turn.started", "b", "turn_1"),
        event("session.waiting", "w"),
      ]),
      undefined,
    );
  });
});

describe("mergeStreamEventLogs", () => {
  it("appends new ids and keeps the original prefix", () => {
    const prefix = [event("session.started", "a"), event("turn.started", "b", "t1")];
    const incoming = [
      event("turn.started", "b", "t1"),
      event("message.appended", "c"),
    ];
    const merged = mergeStreamEventLogs(prefix, incoming);
    assert.deepEqual(
      merged.map((entry) => streamEventId(entry)),
      ["a", "b", "c"],
    );
  });
});
