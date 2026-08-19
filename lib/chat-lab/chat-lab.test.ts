import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { delayForEvent } from "./delays.ts";
import { adjacentCheckpointIndex, buildCheckpoints } from "./checkpoints.ts";
import { resetEventMetaCounter } from "./event-meta.ts";
import { messagesAtIndex, reduceEventPrefix } from "./reduce.ts";
import { reconcileEventLog } from "./reconcile.ts";
import { CHAT_LAB_SCENARIOS } from "./scenarios/index.ts";
import {
  deriveChatStatus,
  extractTurnFailureMessage,
  isHitlPauseEvent,
} from "./status.ts";

describe("chat-lab reduce", () => {
  for (const scenario of CHAT_LAB_SCENARIOS) {
    it(`${scenario.id} reduces to completion without throwing`, () => {
      resetEventMetaCounter();
      const data = reduceEventPrefix(scenario.events);
      assert.ok(data.messages.length >= 1);
      assert.equal(data.messages[0]?.role, "user");
    });

    it(`${scenario.id} seek is deterministic`, () => {
      resetEventMetaCounter();
      const mid = Math.floor(scenario.events.length / 2);
      const a = messagesAtIndex(scenario.events, mid);
      const b = messagesAtIndex(scenario.events, mid);
      assert.deepEqual(a, b);
    });
  }

  it("reconcile replaces optimistic submit with message.received", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "plain-stream");
    assert.ok(scenario);
    const reconciled = reconcileEventLog(scenario.events);
    const submitted = reconciled.filter((event) => event.type === "client.message.submitted");
    const received = reconciled.filter((event) => event.type === "message.received");
    assert.equal(submitted.length, 0);
    assert.equal(received.length, 1);

    const data = reduceEventPrefix(scenario.events);
    const users = data.messages.filter((message) => message.role === "user");
    assert.equal(users.length, 1);
    assert.equal(users[0]?.metadata?.optimistic, undefined);
  });
});

describe("chat-lab status", () => {
  it("maps prefixes to submitted → streaming → ready", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "plain-stream");
    assert.ok(scenario);

    const submittedAt = scenario.events.findIndex(
      (event) => event.type === "client.message.submitted",
    );
    assert.equal(
      deriveChatStatus(scenario.events.slice(0, submittedAt + 1)),
      "submitted",
    );

    const streamingAt = scenario.events.findIndex(
      (event) => event.type === "message.appended",
    );
    assert.equal(
      deriveChatStatus(scenario.events.slice(0, streamingAt + 1)),
      "streaming",
    );

    assert.equal(deriveChatStatus(scenario.events), "ready");
  });

  it("maps turn.failed to error and extracts the message", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "error");
    assert.ok(scenario);
    assert.equal(deriveChatStatus(scenario.events), "error");
    assert.match(
      extractTurnFailureMessage(scenario.events) ?? "",
      /timed out/i,
    );
  });
});

describe("chat-lab checkpoints and parts", () => {
  it("plain-stream exposes text checkpoint with streaming then done text", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "plain-stream");
    assert.ok(scenario);
    const checkpoints = buildCheckpoints(scenario.events);
    const text = checkpoints.find((checkpoint) => checkpoint.kind === "text");
    assert.ok(text);

    const mid = reduceEventPrefix(scenario.events.slice(0, text.index));
    const assistant = mid.messages.find((message) => message.role === "assistant");
    const streamingText = assistant?.parts.find((part) => part.type === "text");
    assert.equal(streamingText?.type, "text");
    assert.equal(streamingText?.state, "streaming");

    const done = reduceEventPrefix(scenario.events);
    const doneText = done.messages
      .find((message) => message.role === "assistant")
      ?.parts.find((part) => part.type === "text");
    assert.equal(doneText?.state, "done");
  });

  it("reasoning-tools has reasoning then tool output-available", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find(
      (entry) => entry.id === "reasoning-tools",
    );
    assert.ok(scenario);
    const checkpoints = buildCheckpoints(scenario.events);

    const reasoning = checkpoints.find((checkpoint) => checkpoint.kind === "reasoning");
    assert.ok(reasoning);
    const atReasoning = reduceEventPrefix(scenario.events.slice(0, reasoning.index));
    const reasoningPart = atReasoning.messages
      .flatMap((message) => message.parts)
      .find((part) => part.type === "reasoning");
    assert.ok(reasoningPart);
    assert.ok(
      reasoningPart.state === "streaming" || reasoningPart.state === "done",
    );

    const tool = checkpoints.find((checkpoint) => checkpoint.kind === "tool");
    assert.ok(tool);
    // Advance past the first action.result for that tool.
    const resultIndex = scenario.events.findIndex(
      (event) => event.type === "action.result",
    );
    const afterResult = reduceEventPrefix(scenario.events.slice(0, resultIndex + 1));
    const toolPart = afterResult.messages
      .flatMap((message) => message.parts)
      .find((part) => part.type === "dynamic-tool");
    assert.equal(toolPart?.type, "dynamic-tool");
    if (toolPart?.type === "dynamic-tool") {
      assert.equal(toolPart.state, "output-available");
    }

    const batches = scenario.events.filter((event) => event.type === "actions.requested");
    assert.ok(batches.length >= 3);
    const firstBatch = batches[0];
    assert.ok(firstBatch && firstBatch.type === "actions.requested");
    assert.ok(firstBatch.data.actions.length >= 3);
    const afterRequest = reduceEventPrefix(
      scenario.events.slice(0, scenario.events.indexOf(firstBatch) + 1),
    );
    const inFlight = afterRequest.messages
      .flatMap((message) => message.parts)
      .filter((part) => part.type === "dynamic-tool" && part.state === "input-available");
    assert.ok(inFlight.length >= 3);

    const toolNames = new Set(
      scenario.events.flatMap((event) => {
        if (event.type !== "action.result") return [];
        const result = event.data.result as { toolName?: string };
        return result.toolName ? [result.toolName] : [];
      }),
    );
    assert.ok(toolNames.size >= 6);
  });

  it("subagent projects several overlapping subagent-call parts", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "subagent");
    assert.ok(scenario);
    const data = reduceEventPrefix(scenario.events);
    const tools = data.messages
      .flatMap((message) => message.parts)
      .filter(
        (part) =>
          part.type === "dynamic-tool"
          && part.toolMetadata?.eve?.kind === "subagent-call",
      );
    assert.ok(tools.length >= 3);
    assert.ok(tools.every((part) => part.type === "dynamic-tool" && part.state === "output-available"));
  });

  it("artifact scenario yields create_artifact output with id", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "artifact");
    assert.ok(scenario);
    const data = reduceEventPrefix(scenario.events);
    const tool = data.messages
      .flatMap((message) => message.parts)
      .find(
        (part) => part.type === "dynamic-tool" && part.toolName === "create_artifact",
      );
    assert.ok(tool);
    if (tool?.type === "dynamic-tool") {
      assert.equal(tool.state, "output-available");
      assert.ok(tool.output && typeof tool.output === "object");
      assert.equal(
        (tool.output as { id?: string }).id,
        scenario.artifactIds?.[0],
      );
    }
  });

  it("hitl-memory pauses on input.requested with approval-requested", () => {
    resetEventMetaCounter();
    const scenario = CHAT_LAB_SCENARIOS.find((entry) => entry.id === "hitl-memory");
    assert.ok(scenario);
    const last = scenario.events[scenario.events.length - 1];
    assert.ok(last && isHitlPauseEvent(last));

    const data = reduceEventPrefix(scenario.events);
    const tool = data.messages
      .flatMap((message) => message.parts)
      .find(
        (part) => part.type === "dynamic-tool" && part.toolName === "save_memory",
      );
    assert.ok(tool);
    if (tool?.type === "dynamic-tool") {
      assert.equal(tool.state, "approval-requested");
    }

    assert.ok(scenario.afterHitlApprove?.length);
    assert.ok(scenario.afterHitlDeny?.length);
  });

  it("adjacentCheckpointIndex jumps to previous/next marks", () => {
    const marks = [
      { kind: "submitted" as const, index: 2, label: "Submitted" },
      { kind: "text" as const, index: 10, label: "Text" },
      { kind: "complete" as const, index: 20, label: "Complete" },
    ];
    assert.equal(adjacentCheckpointIndex(marks, 0, 1, 29), 2);
    assert.equal(adjacentCheckpointIndex(marks, 2, 1, 29), 10);
    assert.equal(adjacentCheckpointIndex(marks, 10, -1, 29), 2);
    assert.equal(adjacentCheckpointIndex(marks, 2, -1, 29), 0);
    assert.equal(adjacentCheckpointIndex(marks, 20, 1, 29), 29);
  });
});

describe("chat-lab delays", () => {
  it("holds on first token after step.started (TTFT)", () => {
    const step = { type: "step.started" } as never;
    const token = { type: "message.appended" } as never;
    assert.ok(delayForEvent(token, step) > delayForEvent(token, token));
  });

  it("dwells longer on artifact writes than generic tools", () => {
    const artifact = {
      type: "action.result",
      data: { result: { kind: "tool-result", toolName: "create_artifact" } },
    } as never;
    const search = {
      type: "action.result",
      data: { result: { kind: "tool-result", toolName: "search_drive" } },
    } as never;
    const lifecycle = { type: "session.waiting" } as never;
    assert.ok(delayForEvent(artifact) > delayForEvent(search));
    assert.ok(delayForEvent(search) > delayForEvent(lifecycle));
  });
});
