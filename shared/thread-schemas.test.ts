import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

/**
 * Mirror of server/schemas/threads.ts — kept in shared so `pnpm test` can
 * exercise the contract without Next path aliases. Keep in sync when the
 * route schemas change.
 */
const agentPrefsSchema = z.object({
  mode: z.enum(["zest", "juice"]),
  reasoning: z.enum(["low", "medium", "high"]),
});

const eveSessionSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  continuationToken: z.string().trim().min(1).optional(),
  streamIndex: z.number().int().min(0),
});

const threadStateSchema = z.object({
  session: eveSessionSchema,
  events: z.array(z.unknown()),
  titleMeta: z
    .object({
      lastUserCount: z.number().int().min(0),
      lastPhase: z.enum(["seed", "refine"]),
      source: z.enum(["truncated", "generated"]),
    })
    .optional(),
  agentPrefs: agentPrefsSchema.optional(),
  source: z.enum(["web", "slack"]).optional(),
});

const appendThreadEventsBodySchema = z.object({
  userId: z.string().trim().min(1),
  threadId: z.string().trim().min(1).max(200),
  sessionId: z.string().trim().min(1),
  continuationToken: z.string().trim().min(1).optional(),
  source: z.enum(["web", "slack"]),
  title: z.string().trim().min(1).max(200).optional(),
  events: z.array(z.unknown()).min(1).max(20),
});

const generateTitleBodySchema = z.object({
  mode: z.enum(["seed", "refine"]),
  seedText: z.string().trim().min(1).max(4000).optional(),
  force: z.boolean().optional(),
});

const patchThreadBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  state: threadStateSchema.optional(),
  agentPrefs: agentPrefsSchema.optional(),
});

describe("appendThreadEventsBodySchema", () => {
  it("accepts web and slack ingest payloads", () => {
    const parsed = appendThreadEventsBodySchema.parse({
      userId: "user_1",
      threadId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      sessionId: "sess_1",
      source: "web",
      events: [{ type: "session.started" }],
    });
    assert.equal(parsed.source, "web");
  });

  it("rejects empty events and invalid source", () => {
    assert.throws(() =>
      appendThreadEventsBodySchema.parse({
        userId: "u",
        threadId: "t",
        sessionId: "s",
        source: "web",
        events: [],
      }),
    );
    assert.throws(() =>
      appendThreadEventsBodySchema.parse({
        userId: "u",
        threadId: "t",
        sessionId: "s",
        source: "email",
        events: [{}],
      }),
    );
  });
});

describe("threadStateSchema / patch / generate-title", () => {
  it("accepts session-only husks and full state", () => {
    const husk = threadStateSchema.parse({
      session: { streamIndex: 0 },
      events: [],
      source: "web",
    });
    assert.equal(husk.events.length, 0);

    const full = threadStateSchema.parse({
      session: { sessionId: "sess", streamIndex: 2 },
      events: [{ type: "turn.started" }],
      agentPrefs: { mode: "zest", reasoning: "high" },
    });
    assert.equal(full.session.sessionId, "sess");
  });

  it("accepts title-only patches and seed/refine title bodies", () => {
    assert.equal(
      patchThreadBodySchema.parse({ title: "Case study" }).title,
      "Case study",
    );
    assert.equal(
      generateTitleBodySchema.parse({ mode: "seed", seedText: "hello" }).mode,
      "seed",
    );
    assert.equal(
      generateTitleBodySchema.parse({ mode: "refine", force: true }).force,
      true,
    );
  });
});
