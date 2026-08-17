import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAgentPrefs,
  applyTitleMeta,
  keptLongerEventLog,
  mergeThreadState,
} from "./thread-state-merge.ts";
import type { ThreadState } from "./types/thread.ts";

function baseState(overrides: Partial<ThreadState> = {}): ThreadState {
  return {
    session: { sessionId: "sess_1", streamIndex: 2 },
    events: [
      { type: "session.started", meta: { id: "e1" } },
      { type: "turn.started", meta: { id: "e2" } },
    ],
    source: "web",
    ...overrides,
  };
}

describe("mergeThreadState", () => {
  it("never shrinks the event log when a title/prefs race sends events: []", () => {
    const existing = baseState();
    const incoming: ThreadState = {
      session: { streamIndex: 0 },
      events: [],
    };

    const merged = mergeThreadState(existing, incoming);
    assert.equal(merged.events.length, 2);
    assert.equal(keptLongerEventLog(existing, incoming), true);
    assert.equal(merged.session.sessionId, "sess_1");
    assert.equal(merged.session.streamIndex, 2);
  });

  it("replaces when the incoming log is longer", () => {
    const existing = baseState();
    const incoming: ThreadState = {
      session: { sessionId: "sess_1", streamIndex: 3 },
      events: [
        { type: "session.started", meta: { id: "e1" } },
        { type: "turn.started", meta: { id: "e2" } },
        { type: "step.completed", meta: { id: "e3" } },
      ],
      source: "web",
    };

    const merged = mergeThreadState(existing, incoming);
    assert.equal(merged.events.length, 3);
    assert.equal(keptLongerEventLog(existing, incoming), false);
  });

  it("coalesces session, titleMeta, agentPrefs, and source", () => {
    const existing = baseState({
      titleMeta: { lastUserCount: 1, lastPhase: "seed", source: "generated" },
      agentPrefs: { mode: "zest", reasoning: "high" },
    });
    const incoming: ThreadState = {
      session: { sessionId: "sess_2", streamIndex: 1 },
      events: existing.events,
      source: undefined,
    };

    const merged = mergeThreadState(existing, incoming);
    assert.equal(merged.session.sessionId, "sess_2");
    assert.equal(merged.titleMeta?.lastPhase, "seed");
    assert.equal(merged.agentPrefs?.mode, "zest");
    assert.equal(merged.source, "web");
  });
});

describe("applyTitleMeta / applyAgentPrefs", () => {
  it("preserves events when stamping title metadata", () => {
    const existing = baseState();
    const next = applyTitleMeta(existing, {
      lastUserCount: 1,
      lastPhase: "seed",
      source: "generated",
    });
    assert.equal(next.events.length, 2);
    assert.equal(next.titleMeta?.source, "generated");
  });

  it("normalizes agent prefs without wiping events", () => {
    const existing = baseState();
    const next = applyAgentPrefs(existing, {
      mode: "juice",
      reasoning: "low",
    } as never);
    assert.equal(next.events.length, 2);
    assert.deepEqual(next.agentPrefs, { mode: "juice", reasoning: "low" });
  });
});
