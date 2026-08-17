import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectionFromAuthAttributes } from "./model-routing.ts";

describe("selectionFromAuthAttributes", () => {
  it("maps zest/juice headers to tiers and reasoning", () => {
    assert.deepEqual(
      selectionFromAuthAttributes({ agentMode: "juice", agentReasoning: "low" }),
      { tier: "premium", reasoning: "low" },
    );
    assert.deepEqual(
      selectionFromAuthAttributes({ agentMode: "zest", agentReasoning: "medium" }),
      { tier: "chat", reasoning: "medium" },
    );
  });

  it("defaults unknowns and null attributes", () => {
    assert.deepEqual(selectionFromAuthAttributes(null), {
      tier: "chat",
      reasoning: "high",
    });
    assert.deepEqual(
      selectionFromAuthAttributes({ agentMode: "nope", agentReasoning: "max" }),
      { tier: "chat", reasoning: "high" },
    );
  });
});
