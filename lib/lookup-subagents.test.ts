import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { lookupFindingsSchema } from "../agent/lib/lookup-findings.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("lookup findings schema", () => {
  it("accepts the specialist return contract", () => {
    const parsed = lookupFindingsSchema.parse({
      summary: "Acme is a customer; March coverage is thin.",
      claims: [
        {
          text: "Owner is Sam Rivera",
          source: "HubSpot",
          url: "https://app.hubspot.com/contacts/1/company/2",
        },
      ],
      citations: [
        {
          url: "https://app.hubspot.com/contacts/1/company/2",
          label: "Acme Corp",
        },
      ],
      gaps: ["Slack not searched"],
      confidence: "medium",
    });
    assert.equal(parsed.confidence, "medium");
    assert.equal(parsed.claims.length, 1);
  });

  it("rejects a missing confidence", () => {
    assert.throws(() =>
      lookupFindingsSchema.parse({
        summary: "None",
        claims: [],
        citations: [],
        gaps: [],
      }),
    );
  });
});

describe("lookup subagent isolation", () => {
  it("does not remount Slack on researcher or lookup connectors on slack-scan", () => {
    const researcherTools = readdirSync(
      join(repoRoot, "agent/subagents/researcher/tools"),
    );
    const researcherConnections = readdirSync(
      join(repoRoot, "agent/subagents/researcher/connections"),
    );
    const slackTools = readdirSync(
      join(repoRoot, "agent/subagents/slack-scan/tools"),
    );

    assert.ok(!researcherTools.includes("search_slack.ts"));
    assert.ok(!researcherTools.includes("save_memory.ts"));
    assert.ok(!researcherTools.includes("create_artifact.ts"));
    assert.ok(researcherTools.includes("search_drive.ts"));
    assert.ok(researcherTools.includes("search_companies_house.ts"));
    assert.ok(researcherTools.includes("get_company_profile.ts"));
    assert.ok(researcherTools.includes("get_company_officers.ts"));
    assert.ok(researcherTools.includes("list_company_filings.ts"));
    assert.deepEqual(
      [...researcherConnections].sort(),
      ["asana.ts", "hubspot.ts", "notion.ts", "platform.ts", "retool.ts", "tally.ts"],
    );

    assert.ok(slackTools.includes("search_slack.ts"));
    assert.ok(!slackTools.includes("search_drive.ts"));
    assert.ok(!slackTools.includes("search_companies_house.ts"));
    assert.ok(!slackTools.includes("save_memory.ts"));
    assert.ok(!slackTools.includes("create_artifact.ts"));
  });
});
