/** Map Eve / MCP tool names to a stable category + display label for usage stats. */

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
  if (name.startsWith("drive__") || name.includes("drive") || name.includes("google_drive")) {
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
