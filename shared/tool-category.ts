/** Map Eve / MCP tool names to a stable category + display label for usage stats. */

const CONNECTION_CATEGORIES: Record<string, { category: string; label: string }> = {
  slack: { category: "slack", label: "Slack" },
  hubspot: { category: "hubspot", label: "HubSpot" },
  notion: { category: "notion", label: "Notion" },
  drive: { category: "drive", label: "Google Drive" },
  google: { category: "drive", label: "Google Drive" },
  tally: { category: "tally", label: "Tally" },
  platform: { category: "platform", label: "CodeBase Platform" },
};

/** Known popular-tool category keys (URL slug safe). */
export const TOOL_CATEGORY_KEYS = [
  "slack",
  "hubspot",
  "notion",
  "drive",
  "tally",
  "platform",
  "development",
  "todos",
  "memory",
  "web",
  "other",
  "connections",
] as const;

export type ToolCategoryKey = (typeof TOOL_CATEGORY_KEYS)[number];

export function isToolCategoryKey(value: string): value is ToolCategoryKey {
  return (TOOL_CATEGORY_KEYS as readonly string[]).includes(value);
}

export function categoryLabel(category: string): string {
  switch (category) {
    case "slack":
      return "Slack";
    case "hubspot":
      return "HubSpot";
    case "notion":
      return "Notion";
    case "drive":
      return "Google Drive";
    case "tally":
      return "Tally";
    case "platform":
      return "CodeBase Platform";
    case "development":
      return "Code";
    case "todos":
      return "Todos";
    case "memory":
      return "Memory";
    case "web":
      return "Web";
    case "connections":
      return "Connections";
    case "other":
      return "Other";
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

/**
 * Resolve category for a tool call. `connection_search` with a known
 * `connection` input maps to that connector (for thread mix / drill-down).
 */
export function toolCategoryForCall(
  toolName: string,
  connection?: string | null,
): { category: string; label: string } {
  const name = toolName.toLowerCase();
  if (
    (name === "connection_search" || name.includes("connection_search"))
    && connection
  ) {
    const mapped = CONNECTION_CATEGORIES[connection.toLowerCase()];
    if (mapped) {
      return mapped;
    }
  }
  return toolCategory(toolName);
}

export function toolCategory(toolName: string): { category: string; label: string } {
  const name = toolName.toLowerCase();

  if (name === "search_slack" || name.startsWith("slack__")) {
    return { category: "slack", label: "Slack" };
  }
  if (name.startsWith("hubspot__") || name.includes("hubspot")) {
    return { category: "hubspot", label: "HubSpot" };
  }
  if (name.startsWith("notion__") || name.includes("notion")) {
    return { category: "notion", label: "Notion" };
  }
  if (
    name === "search_drive"
    || name === "list_recent_drive"
    || name === "read_drive_file"
    || name.startsWith("drive__")
    || name.includes("drive")
    || name.includes("google_drive")
  ) {
    return { category: "drive", label: "Google Drive" };
  }
  if (name.startsWith("tally__") || name.includes("tally")) {
    return { category: "tally", label: "Tally" };
  }
  if (name.startsWith("platform__") || name.includes("platform")) {
    return { category: "platform", label: "CodeBase Platform" };
  }
  if (name === "connection_search" || name.includes("connection_search")) {
    return { category: "connections", label: "Connections" };
  }
  if (name === "bash" || name === "shell" || name.endsWith("__bash")) {
    return { category: "development", label: "Code" };
  }
  if (name === "todo" || name.startsWith("todo") || name.includes("todo_write")) {
    return { category: "todos", label: "Todos" };
  }
  if (name.includes("memory") || name === "save_memory") {
    return { category: "memory", label: "Memory" };
  }
  if (
    name.includes("web_search")
    || name.includes("websearch")
    || name.includes("web_fetch")
    || name === "web_fetch"
    || name === "webfetch"
  ) {
    return { category: "web", label: "Web" };
  }

  const bare = toolName.split(/[:/]/).at(-1) ?? toolName;
  const pretty = bare
    .replace(/^hubspot__/i, "")
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return { category: "other", label: pretty || toolName };
}
