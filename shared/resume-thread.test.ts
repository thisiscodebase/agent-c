import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumeOptionsFromThread } from "./resume-thread.ts";
import type { ThreadRecord } from "./types/thread.ts";
import {
  shouldRefineThreadTitle,
  shouldSeedThreadTitle,
  truncateThreadTitle,
} from "./types/thread.ts";

describe("truncateThreadTitle", () => {
  it("keeps the first line and truncates long titles", () => {
    assert.equal(truncateThreadTitle("Hello\nWorld"), "Hello");
    assert.equal(truncateThreadTitle("   "), "New chat");
    const long = "x".repeat(80);
    assert.equal(truncateThreadTitle(long).endsWith("…"), true);
    assert.ok(truncateThreadTitle(long).length <= 60);
  });
});

describe("shouldSeedThreadTitle / shouldRefineThreadTitle", () => {
  it("seeds when titleMeta is missing or truncated", () => {
    assert.equal(shouldSeedThreadTitle(undefined), true);
    assert.equal(
      shouldSeedThreadTitle({
        lastUserCount: 1,
        lastPhase: "seed",
        source: "truncated",
      }),
      true,
    );
    assert.equal(
      shouldSeedThreadTitle({
        lastUserCount: 1,
        lastPhase: "seed",
        source: "generated",
      }),
      false,
    );
  });

  it("refines on userCount 1 and every 4 thereafter, with dedupe", () => {
    assert.equal(shouldRefineThreadTitle(0, undefined), false);
    assert.equal(shouldRefineThreadTitle(1, undefined), true);
    assert.equal(shouldRefineThreadTitle(2, undefined), false);
    assert.equal(shouldRefineThreadTitle(4, undefined), true);
    assert.equal(shouldRefineThreadTitle(8, undefined), true);
    assert.equal(
      shouldRefineThreadTitle(4, {
        lastUserCount: 4,
        lastPhase: "refine",
        source: "generated",
      }),
      false,
    );
    assert.equal(
      shouldRefineThreadTitle(4, {
        lastUserCount: 1,
        lastPhase: "seed",
        source: "generated",
      }),
      true,
    );
  });
});

describe("resumeOptionsFromThread", () => {
  const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("builds initialEvents and raises streamIndex to events.length", () => {
    const events = [
      { type: "session.started", meta: { id: "1" } },
      { type: "message.completed", meta: { id: "2" } },
    ];
    const options = resumeOptionsFromThread({
      id,
      title: "Test",
      createdAt: 0,
      updatedAt: 0,
      state: {
        session: { sessionId: "sess_1", streamIndex: 1 },
        events,
        source: "web",
      },
    } satisfies ThreadRecord);

    assert.equal(options.initialSession?.sessionId, "sess_1");
    assert.equal(options.initialSession?.streamIndex, 2);
    assert.equal(options.initialEvents?.length, 2);
  });

  it("resumes session-only when events are empty", () => {
    const options = resumeOptionsFromThread({
      id,
      title: "Husk",
      createdAt: 0,
      updatedAt: 0,
      state: {
        session: { sessionId: "sess_only", streamIndex: 0 },
        events: [],
        source: "web",
      },
    });
    assert.equal(options.initialSession?.sessionId, "sess_only");
    assert.equal(options.initialEvents, undefined);
  });

  it("returns events without session when sessionId is missing", () => {
    const events = [{ type: "turn.started", meta: { id: "1" } }];
    const options = resumeOptionsFromThread({
      id,
      title: "Orphan",
      createdAt: 0,
      updatedAt: 0,
      state: {
        session: { streamIndex: 0 },
        events,
      },
    });
    assert.equal(options.initialSession, undefined);
    assert.equal(options.initialEvents?.length, 1);
  });

  it("returns empty options for a null state", () => {
    assert.deepEqual(
      resumeOptionsFromThread({
        id,
        title: "Empty",
        createdAt: 0,
        updatedAt: 0,
        state: null,
      }),
      {},
    );
  });
});
