import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSubagentName,
  getSubagentTask,
  getToolDisplayInfo,
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

  it("treats declared specialist slugs as subagents, not search", () => {
    assert.equal(resolveSubagentName("researcher"), "Researcher");
    assert.equal(resolveSubagentName("slack-scan"), "Slack Scan");
    assert.equal(
      resolveSubagentName("eve:subagent:researcher"),
      "Researcher",
    );
    assert.equal(
      getToolDisplayInfo("researcher", { message: "Look up Acme." }).category,
      "handoff",
    );
    assert.equal(
      getToolDisplayInfo("slack-scan", { message: "Search Slack for Acme." })
        .category,
      "handoff",
    );
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

describe("Companies House tool display", () => {
  it("labels search, profile, officers, and filings", () => {
    assert.equal(
      getToolDisplayInfo("search_companies_house", { query: "CodeBase" }).category,
      "companies_house",
    );
    assert.equal(
      getToolDisplayInfo("search_companies_house", { query: "CodeBase" }).runningLabel,
      "Searching Companies House for “CodeBase”",
    );
    assert.equal(
      getToolDisplayInfo("get_company_profile", { company_number: "sc123456" })
        .runningLabel,
      "Looking up SC123456 on Companies House",
    );
    assert.equal(
      getToolDisplayInfo("get_company_officers", { company_number: "SC123456" })
        .summaryLabel,
      "Listed officers",
    );
    assert.equal(
      getToolDisplayInfo("list_company_filings", { company_number: "SC123456" })
        .completedLabel,
      "Listed filings for SC123456",
    );
  });
});
