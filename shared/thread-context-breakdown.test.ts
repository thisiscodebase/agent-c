import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTEXT_BASELINE_LOCAL_TOOLS_TOKENS,
  CONTEXT_BASELINE_MCP_PER_CONNECTOR_TOKENS,
  CONTEXT_BASELINE_SKILL_TOKENS,
  CONTEXT_BASELINE_SYSTEM_TOKENS,
} from "./context-baselines.ts";
import { estimateTokensFromText } from "./estimate-tokens.ts";
import {
  CONTEXT_CATEGORY_KEYS,
  estimateThreadContextBreakdown,
} from "./thread-context-breakdown.ts";

function categorySum(
  categories: Record<(typeof CONTEXT_CATEGORY_KEYS)[number], number>,
): number {
  return CONTEXT_CATEGORY_KEYS.reduce((acc, key) => acc + categories[key], 0);
}

describe("estimateTokensFromText", () => {
  it("uses chars/4", () => {
    assert.equal(estimateTokensFromText("abcd"), 1);
    assert.equal(estimateTokensFromText("abcde"), 2);
    assert.equal(estimateTokensFromText(""), 0);
  });
});

describe("estimateThreadContextBreakdown", () => {
  it("returns null when usage is missing", () => {
    assert.equal(estimateThreadContextBreakdown({ events: [] }), null);
    assert.equal(
      estimateThreadContextBreakdown({ events: [{ type: "turn.started" }] }),
      null,
    );
  });

  it("reads inputTokens from step.completed and reconciles categories", () => {
    const inputTokens = 50_000;
    const result = estimateThreadContextBreakdown({
      events: [
        {
          type: "step.completed",
          data: {
            usage: {
              inputTokens,
              cacheReadTokens: 100,
              cacheWriteTokens: 20,
            },
          },
        },
      ],
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "hello world" }],
        },
      ],
      contextWindowTokens: 200_000,
    });

    assert.ok(result);
    assert.equal(result.inputTokens, inputTokens);
    assert.equal(result.percentFull, 25);
    assert.equal(result.cacheReadTokens, 100);
    assert.equal(result.cacheWriteTokens, 20);
    assert.equal(categorySum(result.categories), inputTokens);
    assert.ok(result.categories.system > 0);
    assert.ok(result.categories.tools > 0);
    assert.ok(result.categories.conversation > 0);
    assert.ok(result.categories.other >= 0);
  });

  it("scales conversation down when estimate exceeds remaining budget", () => {
    const fixed =
      CONTEXT_BASELINE_SYSTEM_TOKENS + CONTEXT_BASELINE_LOCAL_TOOLS_TOKENS;
    const inputTokens = fixed + 100;
    const longText = "x".repeat(40_000); // ~10k tokens estimated
    const result = estimateThreadContextBreakdown({
      inputTokens,
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: longText }],
        },
      ],
      contextWindowTokens: 200_000,
    });

    assert.ok(result);
    assert.equal(result.categories.conversation, 100);
    assert.equal(categorySum(result.categories), inputTokens);
  });

  it("puts remainder in other for short conversations", () => {
    const inputTokens =
      CONTEXT_BASELINE_SYSTEM_TOKENS
      + CONTEXT_BASELINE_LOCAL_TOOLS_TOKENS
      + 5_000;
    const result = estimateThreadContextBreakdown({
      inputTokens,
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "hi" }],
        },
      ],
      contextWindowTokens: 200_000,
    });

    assert.ok(result);
    assert.ok(result.categories.other > 0);
    assert.equal(categorySum(result.categories), inputTokens);
  });

  it("counts MCP connectors and skills when present", () => {
    const inputTokens = 40_000;
    const result = estimateThreadContextBreakdown({
      inputTokens,
      events: [
        {
          type: "step.completed",
          data: {
            usage: { inputTokens },
            actions: [
              {
                kind: "tool-call",
                toolName: "connection_search",
                input: { connection: "hubspot" },
              },
              {
                kind: "tool-call",
                toolName: "notion__notion-search",
                input: {},
              },
            ],
          },
        },
      ],
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "Use the bid-writing skill." }],
        },
      ],
      contextWindowTokens: 200_000,
    });

    assert.ok(result);
    assert.equal(
      result.categories.mcp,
      2 * CONTEXT_BASELINE_MCP_PER_CONNECTOR_TOKENS,
    );
    assert.equal(
      result.categories.skills,
      CONTEXT_BASELINE_SKILL_TOKENS["bid-writing"],
    );
    assert.equal(categorySum(result.categories), inputTokens);
  });

  it("scales fixed buckets when input is smaller than baselines", () => {
    const inputTokens = 1_000;
    const result = estimateThreadContextBreakdown({
      inputTokens,
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "x".repeat(8_000) }],
        },
      ],
      contextWindowTokens: 200_000,
    });

    assert.ok(result);
    assert.equal(result.categories.conversation, 0);
    assert.equal(categorySum(result.categories), inputTokens);
    assert.ok(
      result.categories.system + result.categories.tools
        <= inputTokens,
    );
  });
});
