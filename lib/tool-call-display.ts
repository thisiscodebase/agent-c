export type ToolDisplayInfo = {
  category: string;
  integrationName?: string;
  showCategory: boolean;
  runningLabel: string;
  completedLabel: string;
  /** Short past-tense label for group summaries (no query/command details). */
  summaryLabel: string;
};

/** Categories where sequential calls replace prior state rather than append history. */
export const STATEFUL_TOOL_CATEGORIES = new Set(["todos"]);
const STATEFUL_CATEGORIES = STATEFUL_TOOL_CATEGORIES;

function titleCaseFromSnake(name: string): string {
  return name
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function truncate(value: string, max = 48): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

/** Latest markdown-style section title in a streaming or completed reasoning block. */
export function getLatestReasoningHeading(text: string): string | null {
  let latest: string | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const atx = trimmed.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx) {
      latest = atx[1]!.trim();
      continue;
    }

    const bold = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (bold) {
      latest = bold[1]!.trim();
    }
  }

  return latest ? truncate(latest, 56) : null;
}

function getBashCommand(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  for (const key of ["command", "cmd", "script", "code"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return truncate(value);
  }
  return undefined;
}

function getSearchQuery(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  for (const key of ["query", "q", "search", "search_term", "term"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return truncate(value, 40);
  }
  return undefined;
}

function getSubagentMessage(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const record = input as Record<string, unknown>;
  for (const key of ["message", "task", "prompt", "instructions", "goal"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return truncate(value, 72);
  }
  return undefined;
}

/** Built-in `agent` tool or Eve-qualified subagent tool names. */
function isSubagentTool(name: string): boolean {
  return (
    name === "agent"
    || name.includes("subagent")
    || name.endsWith(":agent")
    || name.includes("handoff")
    || name.includes("delegate")
  );
}

function subagentDisplayName(toolName: string): string {
  const lower = toolName.toLowerCase();
  if (lower === "agent" || lower.endsWith(":agent") || lower.includes("subagent:agent")) {
    return "subagent";
  }
  const bare = toolName.split(/[:/]/).at(-1) ?? toolName;
  return bare.replace(/[_-]+/g, " ").trim() || "subagent";
}

/** Agent / MCP tool discovery (not connector or web search). */
function isInternalToolSearch(name: string): boolean {
  return (
    name === "retrieve_tools"
    || name === "connection_search"
    || name === "list_tools"
    || name === "get_tools"
    || name === "load_tools"
    || name === "search_tools"
  );
}

/** Built-in web search tools. */
function isWebSearch(name: string): boolean {
  return (
    name === "web_search"
    || name === "search_web"
    || name === "internet_search"
    || name === "search"
  );
}

/**
 * Map Eve tool names to display category, labels, and integration metadata.
 */
export function getToolDisplayInfo(
  toolName: string,
  input?: unknown,
): ToolDisplayInfo {
  const name = toolName.toLowerCase();

  if (name === "bash" || name === "shell" || name.endsWith("__bash")) {
    const command = getBashCommand(input);
    return {
      category: "development",
      showCategory: false,
      runningLabel: command ? `Running ${command}` : "Running code",
      completedLabel: command ? `Ran ${command}` : "Ran code",
      summaryLabel: "Ran code",
    };
  }

  if (name === "todo" || name.startsWith("todo") || name.includes("todo_write") || name.includes("todo_read")) {
    return {
      category: "todos",
      showCategory: false,
      runningLabel: "Checking todo list",
      completedLabel: "Checked todo list",
      summaryLabel: "Checked todo list",
    };
  }

  if (name === "search_slack" || name.startsWith("slack__")) {
    const query = getSearchQuery(input);
    return {
      category: "slack",
      integrationName: "Slack",
      showCategory: true,
      runningLabel: query ? `Searching Slack for “${query}”` : "Searching Slack",
      completedLabel: query ? `Searched Slack for “${query}”` : "Searched Slack",
      summaryLabel: "Searched Slack",
    };
  }

  if (name.startsWith("hubspot__") || name.includes("hubspot")) {
    const query = getSearchQuery(input);
    return {
      category: "hubspot",
      integrationName: "HubSpot",
      showCategory: true,
      runningLabel: query ? `Searching HubSpot for “${query}”` : "Searching HubSpot",
      completedLabel: query ? `Searched HubSpot for “${query}”` : "Searched HubSpot",
      summaryLabel: "Searched HubSpot",
    };
  }

  if (name.startsWith("notion__") || name.includes("notion")) {
    const query = getSearchQuery(input);
    return {
      category: "notion",
      integrationName: "Notion",
      showCategory: true,
      runningLabel: query ? `Searching Notion for “${query}”` : "Searching Notion",
      completedLabel: query ? `Searched Notion for “${query}”` : "Searched Notion",
      summaryLabel: "Searched Notion",
    };
  }

  if (name.startsWith("drive__") || name.includes("drive")) {
    const query = getSearchQuery(input);
    return {
      category: "drive",
      integrationName: "Google Drive",
      showCategory: true,
      runningLabel: query ? `Searching Drive for “${query}”` : "Searching Drive",
      completedLabel: query ? `Searched Drive for “${query}”` : "Searched Drive",
      summaryLabel: "Searched Drive",
    };
  }

  if (name.startsWith("tally__") || name.includes("tally")) {
    const query = getSearchQuery(input);
    return {
      category: "tally",
      integrationName: "Tally",
      showCategory: true,
      runningLabel: query ? `Querying Tally for “${query}”` : "Querying Tally",
      completedLabel: query ? `Queried Tally for “${query}”` : "Queried Tally",
      summaryLabel: "Queried Tally",
    };
  }

  if (name.startsWith("platform__") || name.includes("platform")) {
    const query = getSearchQuery(input);
    return {
      category: "platform",
      integrationName: "CodeBase Platform",
      showCategory: true,
      runningLabel: query
        ? `Querying Platform for “${query}”`
        : "Querying Platform",
      completedLabel: query
        ? `Queried Platform for “${query}”`
        : "Queried Platform",
      summaryLabel: "Queried Platform",
    };
  }

  if (name === "save_memory" || name.includes("memory")) {
    return {
      category: "memory",
      showCategory: false,
      runningLabel: "Saving memory",
      completedLabel: "Saved memory",
      summaryLabel: "Saved memory",
    };
  }

  if (isInternalToolSearch(name)) {
    return {
      category: "retrieve_tools",
      showCategory: false,
      runningLabel: "Checking tools",
      completedLabel: "Checked tools",
      summaryLabel: "Checked tools",
    };
  }

  if (isWebSearch(name)) {
    const query = getSearchQuery(input);
    return {
      category: "web_search",
      showCategory: false,
      runningLabel: query ? `Searching the web for “${query}”` : "Searching the web",
      completedLabel: query ? `Searched the web for “${query}”` : "Searched the web",
      summaryLabel: "Searched the web",
    };
  }

  if (isSubagentTool(name)) {
    const task = getSubagentMessage(input);
    const who = subagentDisplayName(toolName);
    return {
      category: "handoff",
      showCategory: false,
      runningLabel: task ? `Working via ${who}: ${task}` : `Working via ${who}`,
      completedLabel: task ? `Finished via ${who}: ${task}` : `Finished via ${who}`,
      summaryLabel: "Delegated to subagent",
    };
  }

  if (name.includes("search")) {
    const query = getSearchQuery(input);
    return {
      category: "web_search",
      showCategory: false,
      runningLabel: query ? `Searching for “${query}”` : "Searching",
      completedLabel: query ? `Searched for “${query}”` : "Searched",
      summaryLabel: "Searched",
    };
  }

  const pretty = titleCaseFromSnake(toolName);
  return {
    category: "general",
    showCategory: false,
    runningLabel: `Running ${pretty}`,
    completedLabel: `Ran ${pretty}`,
    summaryLabel: `Ran ${pretty}`,
  };
}

export function formatToolName(name: string): string {
  return titleCaseFromSnake(name);
}

export function serializeToolOutput(output: unknown, errorText?: string): string | undefined {
  if (errorText) return errorText;
  if (output === undefined || output === null) return undefined;
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function asToolInputs(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  return input as Record<string, unknown>;
}

type SummarizableToolCall = {
  tool_name: string;
  tool_category: string;
  message?: string;
};

/**
 * Collapse sequential stateful tool calls (e.g. todos status updates) to the
 * latest entry so chat history reflects final state, not intermediate snapshots.
 */
export function collapseStatefulToolCalls<T extends SummarizableToolCall>(
  entries: T[],
): T[] {
  const result: T[] = [];
  for (const entry of entries) {
    const prev = result.at(-1);
    if (
      prev &&
      STATEFUL_CATEGORIES.has(entry.tool_category) &&
      prev.tool_category === entry.tool_category
    ) {
      result[result.length - 1] = entry;
      continue;
    }
    result.push(entry);
  }
  return result;
}

function lowercaseFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getUniqueSummarizableToolCalls(
  toolCalls: SummarizableToolCall[],
): SummarizableToolCall[] {
  const unique: SummarizableToolCall[] = [];
  const seen = new Set<string>();
  for (const call of toolCalls) {
    const category = call.tool_category || "general";
    if (seen.has(category)) continue;
    seen.add(category);
    unique.push(call);
  }
  return unique;
}

/**
 * Join summary labels: "a", "a and b", "a, b and c", or "Used N tools" for 4+.
 */
export function joinSummaryLabels(labels: string[]): string {
  if (labels.length === 0) return "Working";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) {
    return `${labels[0]} and ${lowercaseFirst(labels[1]!)}`;
  }
  if (labels.length === 3) {
    return `${labels[0]}, ${lowercaseFirst(labels[1]!)} and ${lowercaseFirst(labels[2]!)}`;
  }
  return `Used ${labels.length} tools`;
}

function summaryLabelForCall(call: SummarizableToolCall): string {
  // Prefer the short category summary (no query/command details)
  return getToolDisplayInfo(call.tool_name).summaryLabel;
}

/**
 * Smart group header: named labels for 1–3 unique tool types, count for 4+.
 * e.g. "Checked todos", "Checked todos and searched HubSpot",
 * "Checked todos, searched HubSpot and ran code"
 */
export function getToolCallsSummaryLabel(toolCalls: SummarizableToolCall[]): string {
  const unique = getUniqueSummarizableToolCalls(toolCalls);
  if (unique.length === 0) return "Used 0 tools";
  return joinSummaryLabels(unique.map(summaryLabelForCall));
}

export type ReasoningSummaryInput = {
  isStreaming: boolean;
  durationSeconds?: number;
  text?: string;
};

export function getReasoningSummaryLabel({
  isStreaming,
  durationSeconds,
  text,
}: ReasoningSummaryInput): string {
  if (isStreaming) {
    const heading = text ? getLatestReasoningHeading(text) : null;
    if (heading) return heading;
    return "Thinking...";
  }
  if (durationSeconds !== undefined && durationSeconds > 0) {
    return `Thought for ${durationSeconds}s`;
  }
  return "Thought briefly";
}

/**
 * Combined activity header, e.g. "Thought for 3s, checked tools and searched HubSpot".
 */
export function getActivitySummaryLabel(
  reasoning: ReasoningSummaryInput | null,
  toolCalls: SummarizableToolCall[],
): string {
  const labels: string[] = [];

  if (reasoning) {
    labels.push(getReasoningSummaryLabel(reasoning));
  }

  for (const call of getUniqueSummarizableToolCalls(toolCalls)) {
    labels.push(summaryLabelForCall(call));
  }

  return joinSummaryLabels(labels);
}
