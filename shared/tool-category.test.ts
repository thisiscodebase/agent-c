import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryLabel,
  isToolCategoryKey,
  toolCategory,
  toolCategoryForCall,
} from "./tool-category.ts";

describe("toolCategory", () => {
  it("maps connector tools and REST Drive tools", () => {
    assert.deepEqual(toolCategory("search_slack"), { category: "slack", label: "Slack" });
    assert.deepEqual(toolCategory("notion__search"), {
      category: "notion",
      label: "Notion",
    });
    assert.deepEqual(toolCategory("hubspot__search_crm"), {
      category: "hubspot",
      label: "HubSpot",
    });
    assert.deepEqual(toolCategory("search_drive"), {
      category: "drive",
      label: "Google Drive",
    });
    assert.deepEqual(toolCategory("list_recent_drive"), {
      category: "drive",
      label: "Google Drive",
    });
    assert.deepEqual(toolCategory("read_drive_file"), {
      category: "drive",
      label: "Google Drive",
    });
    assert.deepEqual(toolCategory("asana__get_task"), {
      category: "asana",
      label: "Asana",
    });
    assert.deepEqual(toolCategory("retool__retool_list_apps"), {
      category: "retool",
      label: "Retool",
    });
    assert.deepEqual(toolCategory("platform__query"), {
      category: "platform",
      label: "CodeBase Platform",
    });
  });

  it("maps built-ins and unknown tools", () => {
    assert.deepEqual(toolCategory("connection_search"), {
      category: "connections",
      label: "Connections",
    });
    assert.deepEqual(toolCategory("bash"), { category: "development", label: "Code" });
    assert.deepEqual(toolCategory("todo_write"), { category: "todos", label: "Todos" });
    assert.deepEqual(toolCategory("save_memory"), { category: "memory", label: "Memory" });
    assert.deepEqual(toolCategory("web_search"), { category: "web", label: "Web" });
    assert.equal(toolCategory("weird_custom_tool").category, "other");
  });
});

describe("toolCategoryForCall", () => {
  it("remaps connection_search discovery to the connector", () => {
    assert.deepEqual(toolCategoryForCall("connection_search", "notion"), {
      category: "notion",
      label: "Notion",
    });
    assert.deepEqual(toolCategoryForCall("connection_search", null), {
      category: "connections",
      label: "Connections",
    });
  });
});

describe("category helpers", () => {
  it("validates keys and labels", () => {
    assert.equal(isToolCategoryKey("slack"), true);
    assert.equal(isToolCategoryKey("nope"), false);
    assert.equal(categoryLabel("drive"), "Google Drive");
    assert.equal(categoryLabel("custom"), "Custom");
  });
});
