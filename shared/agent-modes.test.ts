import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_AGENT_PREFS,
  defaultReasoningForMode,
  isAgentModeId,
  isAgentReasoningEffort,
  modeToTier,
  normalizeAgentPrefs,
  prefsForMode,
  stepReasoningEffort,
  toggleAgentMode,
  toggleAgentPrefs,
} from "./agent-modes.ts";

describe("agent modes", () => {
  it("validates mode and reasoning ids", () => {
    assert.equal(isAgentModeId("zest"), true);
    assert.equal(isAgentModeId("juice"), true);
    assert.equal(isAgentModeId("extreme"), false);
    assert.equal(isAgentReasoningEffort("high"), true);
    assert.equal(isAgentReasoningEffort("max"), false);
  });

  it("maps modes to tiers and default reasoning", () => {
    assert.equal(modeToTier("zest"), "chat");
    assert.equal(modeToTier("juice"), "premium");
    assert.equal(defaultReasoningForMode("zest"), "high");
    assert.equal(defaultReasoningForMode("juice"), "medium");
  });

  it("normalizes garbage prefs to defaults", () => {
    assert.deepEqual(normalizeAgentPrefs(null), { ...DEFAULT_AGENT_PREFS });
    assert.deepEqual(normalizeAgentPrefs({ mode: "nope", reasoning: 1 }), {
      ...DEFAULT_AGENT_PREFS,
    });
    assert.deepEqual(
      normalizeAgentPrefs({ mode: "juice", reasoning: "low" }),
      { mode: "juice", reasoning: "low" },
    );
  });

  it("toggles mode and steps reasoning with clamps", () => {
    assert.equal(toggleAgentMode("zest"), "juice");
    assert.deepEqual(toggleAgentPrefs({ mode: "zest", reasoning: "high" }), {
      mode: "juice",
      reasoning: "medium",
    });
    assert.deepEqual(prefsForMode("zest"), { mode: "zest", reasoning: "high" });
    assert.equal(stepReasoningEffort("low", -1), "low");
    assert.equal(stepReasoningEffort("low", 1), "medium");
    assert.equal(stepReasoningEffort("high", 1), "high");
  });
});
