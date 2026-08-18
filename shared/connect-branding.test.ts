import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agent } from "./agent.ts";
import {
  ASANA_CONNECTOR,
  CONNECT_USER_ISSUER,
  DRIVE_CONNECTOR,
  DRIVE_OAUTH_SCOPES,
  HUBSPOT_CONNECTOR,
  NOTION_CONNECTOR,
  PLATFORM_CONNECTOR,
  RETOOL_CONNECTOR,
  RETOOL_MCP_URL,
  RETOOL_OAUTH_SCOPES,
  SLACK_CONNECTOR,
  TALLY_CONNECTOR,
} from "./connect.ts";
import {
  handleFromEmail,
  isValidHandle,
  profilePathForEmail,
} from "./user-handle.ts";

describe("connect UIDs + issuer", () => {
  it("keeps stable Connect UIDs and app issuer", () => {
    assert.equal(CONNECT_USER_ISSUER, "app");
    assert.equal(DRIVE_CONNECTOR, "drivemcp.googleapis.com/agent-c");
    assert.equal(HUBSPOT_CONNECTOR, "mcp.hubspot.com/agent-c");
    assert.equal(NOTION_CONNECTOR, "mcp.notion.com/agent-c");
    assert.equal(TALLY_CONNECTOR, "api.tally.so/agent-c");
    assert.equal(ASANA_CONNECTOR, "mcp.asana.com/bole-lantern");
    assert.equal(RETOOL_CONNECTOR, "thisiscodebase.retool.com/agent-c");
    assert.equal(RETOOL_MCP_URL, "https://thisiscodebase.retool.com/mcp");
    assert.equal(SLACK_CONNECTOR, "slack/agent-c");
    assert.equal(PLATFORM_CONNECTOR, "platform-mcp/env");
    assert.ok(
      DRIVE_OAUTH_SCOPES.includes("https://www.googleapis.com/auth/drive.readonly"),
    );
    assert.ok(RETOOL_OAUTH_SCOPES.includes("mcp:read"));
    assert.ok(RETOOL_OAUTH_SCOPES.includes("mcp:write"));
  });
});

describe("agent branding", () => {
  it("exposes Agent C display identity", () => {
    assert.equal(agent.name, "Agent C");
    assert.equal(agent.slug, "agent-c");
  });
});

describe("user handles", () => {
  it("derives profile paths from email local-parts", () => {
    assert.equal(handleFromEmail("alice.bob@example.com"), "alice.bob");
    assert.equal(profilePathForEmail("alice.bob@example.com"), "/u/alice.bob");
    assert.equal(handleFromEmail("bad"), null);
    assert.equal(isValidHandle("alice.bob"), true);
    assert.equal(isValidHandle(""), false);
  });
});
