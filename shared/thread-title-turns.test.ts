import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countUserTurns,
  extractTitleTurnsFromEvents,
  formatTitleTurnsForPrompt,
} from "./thread-title-turns.ts";

describe("extractTitleTurnsFromEvents", () => {
  it("extracts user and assistant turns from stream events", () => {
    const turns = extractTitleTurnsFromEvents([
      { type: "turn.started", data: {} },
      { type: "message.received", data: { message: "  Find the deck  " } },
      { type: "message.completed", data: { message: "Here it is." } },
      { type: "step.completed", data: { usage: {} } },
    ]);
    assert.deepEqual(turns, [
      { role: "user", text: "Find the deck" },
      { role: "assistant", text: "Here it is." },
    ]);
    assert.equal(countUserTurns(turns), 1);
  });

  it("truncates long turns and keeps only the last 8", () => {
    const events = Array.from({ length: 12 }, (_, i) => ({
      type: "message.received",
      data: { message: `msg ${i} ${"x".repeat(500)}` },
    }));
    const turns = extractTitleTurnsFromEvents(events);
    assert.equal(turns.length, 8);
    assert.ok(turns[0]!.text.endsWith("…"));
    assert.ok(turns[0]!.text.length <= 400);
    assert.match(turns[0]!.text, /^msg 4 /);
  });

  it("formats turns for the title prompt", () => {
    assert.equal(
      formatTitleTurnsForPrompt([
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
      ]),
      "User: Hi\nAssistant: Hello",
    );
  });
});
