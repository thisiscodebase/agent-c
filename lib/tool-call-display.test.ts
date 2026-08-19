import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSubagentName,
  getSubagentTask,
  resolveSubagentName,
} from "./tool-call-display.ts";

describe("subagent display", () => {
  it("title-cases slugs and spaced names", () => {
    assert.equal(formatSubagentName("docs-research"), "Docs Research");
    assert.equal(formatSubagentName("slack_scan"), "Slack Scan");
    assert.equal(formatSubagentName("crm research"), "Crm Research");
    assert.equal(formatSubagentName(""), "Subagent");
  });

  it("prefers Eve metadata name over the generic agent tool", () => {
    assert.equal(
      resolveSubagentName("agent", "docs-research"),
      "Docs Research",
    );
    assert.equal(
      resolveSubagentName("eve:subagent:slack-scan"),
      "Slack Scan",
    );
    assert.equal(resolveSubagentName("agent", "agent"), "Subagent");
  });

  it("reads the task from common input keys", () => {
    assert.equal(
      getSubagentTask({ message: "Search Slack for Acme." }),
      "Search Slack for Acme.",
    );
    assert.equal(
      getSubagentTask({ task: " Pull HubSpot. " }),
      "Pull HubSpot.",
    );
    assert.equal(getSubagentTask({}), undefined);
  });
});
