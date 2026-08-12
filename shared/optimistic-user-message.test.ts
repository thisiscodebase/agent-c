import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createOptimisticUserMessage,
  mergeOptimisticUserMessage,
  userMessageText,
} from "./optimistic-user-message.ts";

describe("mergeOptimisticUserMessage", () => {
  it("appends a pending user bubble when the list is empty", () => {
    const pending = createOptimisticUserMessage("Hello", "seed");
    assert.deepEqual(mergeOptimisticUserMessage([], pending), [pending]);
  });

  it("does not duplicate the same trailing user text", () => {
    const pending = createOptimisticUserMessage("Hello", "seed");
    const confirmed = createOptimisticUserMessage("Hello", "eve-1");
    assert.deepEqual(mergeOptimisticUserMessage([confirmed], pending), [
      confirmed,
    ]);
  });

  it("appends when the last user text is different", () => {
    const earlier = createOptimisticUserMessage("Earlier", "eve-1");
    const pending = createOptimisticUserMessage("Next", "seed");
    assert.deepEqual(mergeOptimisticUserMessage([earlier], pending), [
      earlier,
      pending,
    ]);
  });

  it("appends a repeated user text after an assistant turn", () => {
    const first = createOptimisticUserMessage("Hello", "u1");
    const assistant = {
      id: "a1",
      role: "assistant" as const,
      parts: [{ type: "text", text: "Hi" }],
    };
    const pending = createOptimisticUserMessage("Hello", "seed");
    const merged = mergeOptimisticUserMessage([first, assistant], pending);
    assert.equal(merged.length, 3);
    assert.equal(userMessageText(merged[2]!), "Hello");
  });

  it("does not re-append after an empty assistant shell", () => {
    const user = createOptimisticUserMessage("Hello", "u1");
    const shell = {
      id: "a-shell",
      role: "assistant" as const,
      parts: [{ type: "step-start" as const }],
    };
    const pending = createOptimisticUserMessage("Hello", "seed");
    const merged = mergeOptimisticUserMessage([user, shell], pending);
    assert.equal(merged.length, 2);
    assert.equal(merged[0], user);
  });

  it("reads concatenated text parts", () => {
    assert.equal(
      userMessageText({
        role: "user",
        parts: [
          { type: "text", text: "Hi " },
          { type: "text", text: "there" },
        ],
      }),
      "Hi there",
    );
  });
});
