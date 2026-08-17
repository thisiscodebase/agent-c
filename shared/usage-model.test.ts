import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalModelId,
  creditedModelIdsFromEvents,
  modelProviderFromId,
  readEventModelId,
} from "./usage-model.ts";

describe("canonicalModelId / modelProviderFromId", () => {
  it("strips Eve dynamic: prefixes so OpenAI logos resolve", () => {
    assert.equal(canonicalModelId("dynamic:openai/gpt-5.6-luna"), "openai/gpt-5.6-luna");
    assert.equal(modelProviderFromId("dynamic:openai/gpt-5.6-luna"), "openai");
    assert.equal(modelProviderFromId("openai/gpt-5.6-sol"), "openai");
    assert.equal(modelProviderFromId("anthropic/claude-sonnet-5"), "anthropic");
  });
});

describe("readEventModelId", () => {
  it("reads legacy session.started runtime.modelId", () => {
    assert.equal(
      readEventModelId("session.started", {
        runtime: { modelId: "dynamic:openai/gpt-5.6-luna" },
      }),
      "openai/gpt-5.6-luna",
    );
    assert.equal(readEventModelId("session.started", { runtime: {} }), null);
  });

  it("reads the resolved model from step.started (Eve ≥0.33)", () => {
    assert.equal(
      readEventModelId("step.started", { modelId: "openai/gpt-5.6-sol" }),
      "openai/gpt-5.6-sol",
    );
    assert.equal(
      readEventModelId("compaction.requested", {
        modelId: "openai/gpt-5.6-sol",
      }),
      "openai/gpt-5.6-sol",
    );
  });

  it("ignores events that do not carry a model", () => {
    assert.equal(readEventModelId("step.completed", { usage: {} }), null);
    assert.equal(readEventModelId("turn.started", {}), null);
  });
});

describe("creditedModelIdsFromEvents", () => {
  it("uses session.started when no step model exists", () => {
    assert.deepEqual(
      creditedModelIdsFromEvents([
        {
          type: "session.started",
          data: { runtime: { modelId: "dynamic:openai/gpt-5.6-luna" } },
        },
        { type: "turn.started", data: {} },
      ]),
      ["openai/gpt-5.6-luna"],
    );
  });

  it("credits Juice/Sol from step.started instead of the session fallback", () => {
    assert.deepEqual(
      creditedModelIdsFromEvents([
        {
          type: "session.started",
          data: { runtime: { modelId: "dynamic:openai/gpt-5.6-luna" } },
        },
        { type: "step.started", data: { modelId: "openai/gpt-5.6-sol" } },
        { type: "step.completed", data: { usage: { inputTokens: 10 } } },
      ]),
      ["openai/gpt-5.6-sol"],
    );
  });

  it("returns empty when the thread never reported a model", () => {
    assert.deepEqual(
      creditedModelIdsFromEvents([{ type: "turn.started", data: {} }]),
      [],
    );
  });
});
