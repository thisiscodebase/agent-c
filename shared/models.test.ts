import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAgentSelection,
  buildNanoSelection,
  contextWindowForModel,
  FALLBACK_CONTEXT_WINDOW_TOKENS,
  gatewayPrivacyOptions,
  isGatewayModelId,
  maxContextWindowForModel,
  MODEL_DEFAULTS,
  normalizeModelId,
  reasoningProviderOptions,
  resolveAgentTier,
  resolveTierModel,
} from "./models.ts";

describe("normalizeModelId / context windows", () => {
  it("strips Eve dynamic: prefixes", () => {
    assert.equal(normalizeModelId("dynamic:openai/gpt-5.6-luna"), "openai/gpt-5.6-luna");
    assert.equal(normalizeModelId(""), null);
    assert.equal(normalizeModelId(undefined), null);
  });

  it("budgets against the cheap cost tier when present", () => {
    assert.equal(contextWindowForModel("openai/gpt-5.6-luna"), 272_000);
    assert.equal(maxContextWindowForModel("openai/gpt-5.6-luna"), 1_050_000);
    assert.equal(contextWindowForModel("anthropic/claude-sonnet-5"), 1_000_000);
    assert.equal(FALLBACK_CONTEXT_WINDOW_TOKENS, 200_000);
    assert.equal(contextWindowForModel("unknown/model"), FALLBACK_CONTEXT_WINDOW_TOKENS);
  });
});

describe("gateway privacy + tier resolution", () => {
  it("omits ZDR for xAI while keeping no-training", () => {
    assert.deepEqual(gatewayPrivacyOptions("xai/grok-4.5"), {
      disallowPromptTraining: true,
    });
    assert.deepEqual(gatewayPrivacyOptions("xai/grok-5"), {
      disallowPromptTraining: true,
    });
    assert.deepEqual(gatewayPrivacyOptions("openai/gpt-5.6-luna"), {
      disallowPromptTraining: true,
      zeroDataRetention: true,
    });
  });

  it("accepts any Gateway provider/model from Flags, not just the catalog pool", () => {
    assert.equal(resolveAgentTier("premium"), "premium");
    assert.equal(resolveAgentTier("nope"), "chat");
    assert.equal(isGatewayModelId("openai/gpt-5.6-luna"), true);
    assert.equal(isGatewayModelId("xai/grok-5"), true);
    assert.equal(isGatewayModelId("not-in-pool"), false);
    assert.equal(resolveTierModel("chat", "openai/gpt-5.6-luna"), "openai/gpt-5.6-luna");
    assert.equal(resolveTierModel("premium", "openai/gpt-5.6-sol"), "openai/gpt-5.6-sol");
    assert.equal(resolveTierModel("premium", "xai/grok-5"), "xai/grok-5");
    assert.equal(resolveTierModel("chat", "not-in-pool"), MODEL_DEFAULTS.chat);
    assert.equal(resolveTierModel("chat", "  "), MODEL_DEFAULTS.chat);
  });

  it("builds agent and nano selections with gateway options", () => {
    const agent = buildAgentSelection("premium", "xai/grok-4.5", "medium");
    assert.equal(agent.tier, "premium");
    assert.equal(agent.model, "xai/grok-4.5");
    assert.equal(agent.reasoning, "medium");
    assert.equal(agent.gateway.zeroDataRetention, undefined);

    const nano = buildNanoSelection();
    assert.equal(nano.tier, "nano");
    assert.equal(nano.model, MODEL_DEFAULTS.nano);
  });
});

describe("reasoningProviderOptions", () => {
  it("namespaces effort by provider", () => {
    assert.deepEqual(reasoningProviderOptions("openai/gpt-5.6-luna", "high").openai, {
      reasoningEffort: "high",
      reasoningSummary: "auto",
    });
    assert.deepEqual(
      reasoningProviderOptions("anthropic/claude-sonnet-5", "medium").anthropic,
      { thinking: { type: "adaptive", effort: "medium" } },
    );
    assert.deepEqual(reasoningProviderOptions("xai/grok-4.5", "low").xai, {
      reasoningEffort: "low",
    });
    assert.deepEqual(reasoningProviderOptions("unknown/model", "high"), {});
  });
});
