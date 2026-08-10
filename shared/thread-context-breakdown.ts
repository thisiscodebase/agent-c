import {
  CONTEXT_BASELINE_LOCAL_TOOLS_TOKENS,
  CONTEXT_BASELINE_MCP_PER_CONNECTOR_TOKENS,
  CONTEXT_BASELINE_SKILL_TOKENS,
  CONTEXT_BASELINE_SYSTEM_TOKENS,
  isContextMcpConnector,
} from "./context-baselines.ts";
import { estimateTokensFromText } from "./estimate-tokens.ts";

/** Fallback window when callers omit `contextWindowTokens` (matches chat default). */
export const DEFAULT_CONTEXT_BREAKDOWN_WINDOW_TOKENS = 200_000;

export const CONTEXT_CATEGORY_KEYS = [
  "system",
  "tools",
  "mcp",
  "skills",
  "conversation",
  "other",
] as const;

export type ContextCategoryKey = (typeof CONTEXT_CATEGORY_KEYS)[number];

export type ContextCategoryTokens = Record<ContextCategoryKey, number>;

export type ThreadContextBreakdown = {
  /** Authoritative fill from latest Eve step / compaction. */
  inputTokens: number;
  contextWindowTokens: number;
  ratio: number;
  percentFull: number;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  categories: ContextCategoryTokens;
  estimated: true;
};

export type ContextBreakdownMessagePart = {
  type?: string;
  text?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
};

export type ContextBreakdownMessage = {
  role?: string;
  parts?: readonly ContextBreakdownMessagePart[];
};

export type EstimateThreadContextBreakdownArgs = {
  events?: readonly unknown[];
  messages?: readonly ContextBreakdownMessage[];
  /** Prefer pressure helper’s latest inputTokens when already computed. */
  inputTokens?: number | null;
  contextWindowTokens?: number;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function readNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function readConnection(input: unknown): string | null {
  const record = asRecord(input);
  const connection = record?.connection;
  if (typeof connection !== "string" || connection.length === 0) {
    return null;
  }
  return connection.toLowerCase();
}

function readToolCallsFromActions(data: Record<string, unknown> | undefined): Array<{
  toolName: string;
  connection: string | null;
}> {
  const actions = data?.actions;
  if (!Array.isArray(actions)) {
    return [];
  }

  const calls: Array<{ toolName: string; connection: string | null }> = [];
  for (const action of actions) {
    if (!action || typeof action !== "object") {
      continue;
    }
    const row = action as { kind?: unknown; toolName?: unknown; input?: unknown };
    if (row.kind !== undefined && row.kind !== "tool-call") {
      continue;
    }
    const toolName = row.toolName;
    if (typeof toolName !== "string" || toolName.length === 0) {
      continue;
    }
    calls.push({
      toolName,
      connection: readConnection(row.input),
    });
  }
  return calls;
}

function connectorFromToolName(toolName: string): string | null {
  const name = toolName.toLowerCase();
  const prefix = name.match(/^([a-z0-9]+)__/);
  if (prefix?.[1]) {
    return prefix[1];
  }
  return null;
}

function collectMcpConnectors(
  events: readonly unknown[] | undefined,
  messages: readonly ContextBreakdownMessage[] | undefined,
): Set<string> {
  const found = new Set<string>();

  const consider = (toolName: string, connection: string | null) => {
    const name = toolName.toLowerCase();
    if (
      (name === "connection_search" || name.includes("connection_search"))
      && connection
      && isContextMcpConnector(connection)
    ) {
      found.add(connection);
      return;
    }
    const fromName = connectorFromToolName(toolName);
    if (fromName && isContextMcpConnector(fromName)) {
      found.add(fromName);
    }
    if (connection && isContextMcpConnector(connection)) {
      found.add(connection);
    }
  };

  if (Array.isArray(events)) {
    for (const raw of events) {
      const event = asRecord(raw);
      if (!event) continue;
      if (event.type !== "step.completed" && event.type !== "actions.requested") {
        continue;
      }
      for (const call of readToolCallsFromActions(asRecord(event.data))) {
        consider(call.toolName, call.connection);
      }
    }
  }

  if (Array.isArray(messages)) {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (part.type !== "dynamic-tool" || typeof part.toolName !== "string") {
          continue;
        }
        consider(part.toolName, readConnection(part.input));
      }
    }
  }

  return found;
}

function collectLoadedSkills(
  events: readonly unknown[] | undefined,
  messages: readonly ContextBreakdownMessage[] | undefined,
): Set<string> {
  const found = new Set<string>();
  const skillIds = Object.keys(CONTEXT_BASELINE_SKILL_TOKENS);

  const scanText = (text: string) => {
    const lower = text.toLowerCase();
    for (const id of skillIds) {
      if (
        lower.includes(id)
        || lower.includes(`use the ${id}`)
        || lower.includes(`skill ${id}`)
        || lower.includes(`load skill \`${id}\``)
      ) {
        found.add(id);
      }
    }
    // Composer expands bid-writing to this prompt.
    if (lower.includes("use the bid-writing skill")) {
      found.add("bid-writing");
    }
  };

  if (Array.isArray(messages)) {
    for (const message of messages) {
      for (const part of message.parts ?? []) {
        if (typeof part.text === "string" && part.text.length > 0) {
          scanText(part.text);
        }
      }
    }
  }

  if (Array.isArray(events)) {
    for (const raw of events) {
      const event = asRecord(raw);
      if (!event) continue;
      if (
        event.type !== "message.received"
        && event.type !== "message.completed"
        && event.type !== "message.appended"
      ) {
        continue;
      }
      const data = asRecord(event.data);
      const message = asRecord(data?.message) ?? data;
      const content = message?.content ?? message?.text ?? data?.text;
      if (typeof content === "string") {
        scanText(content);
      } else if (Array.isArray(content)) {
        for (const part of content) {
          const record = asRecord(part);
          if (typeof record?.text === "string") {
            scanText(record.text);
          }
        }
      }
    }
  }

  return found;
}

function stringifyUnknown(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function estimateConversationTokens(
  messages: readonly ContextBreakdownMessage[] | undefined,
): number {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 0;
  }

  let tokens = 0;
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (typeof part.text === "string") {
        tokens += estimateTokensFromText(part.text);
      }
      if (part.type === "dynamic-tool") {
        if (typeof part.toolName === "string") {
          tokens += estimateTokensFromText(part.toolName);
        }
        tokens += estimateTokensFromText(stringifyUnknown(part.input));
        tokens += estimateTokensFromText(stringifyUnknown(part.output));
      }
    }
  }

  return tokens;
}

function readLatestUsage(events: readonly unknown[] | undefined): {
  inputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
} {
  let inputTokens: number | null = null;
  let cacheReadTokens: number | null = null;
  let cacheWriteTokens: number | null = null;

  if (!Array.isArray(events)) {
    return { inputTokens, cacheReadTokens, cacheWriteTokens };
  }

  for (const raw of events) {
    const event = asRecord(raw);
    if (!event) continue;
    if (event.type !== "step.completed" && event.type !== "compaction.requested") {
      continue;
    }
    const data = asRecord(event.data);
    const usage = asRecord(data?.usage);
    const fromUsage = readPositiveNumber(usage?.inputTokens);
    const fromCompaction = readPositiveNumber(data?.usageInputTokens);
    const next = fromUsage ?? fromCompaction;
    if (next === null) {
      continue;
    }
    inputTokens = next;
    cacheReadTokens = readNonNegativeNumber(usage?.cacheReadTokens);
    cacheWriteTokens = readNonNegativeNumber(usage?.cacheWriteTokens);
  }

  return { inputTokens, cacheReadTokens, cacheWriteTokens };
}

function emptyCategories(): ContextCategoryTokens {
  return {
    system: 0,
    tools: 0,
    mcp: 0,
    skills: 0,
    conversation: 0,
    other: 0,
  };
}

/**
 * Build a Cursor-like context composition estimate.
 * Eve’s latest inputTokens is authoritative; categories are estimates that
 * always reconcile via `other` (and conversation scaling when over-budget).
 */
export function estimateThreadContextBreakdown(
  args: EstimateThreadContextBreakdownArgs,
): ThreadContextBreakdown | null {
  const contextWindowTokens =
    args.contextWindowTokens ?? DEFAULT_CONTEXT_BREAKDOWN_WINDOW_TOKENS;

  const fromEvents = readLatestUsage(args.events);
  const inputTokens =
    args.inputTokens != null && args.inputTokens > 0
      ? args.inputTokens
      : fromEvents.inputTokens;

  if (inputTokens == null || inputTokens <= 0 || contextWindowTokens <= 0) {
    return null;
  }

  const mcpConnectors = collectMcpConnectors(args.events, args.messages);
  const loadedSkills = collectLoadedSkills(args.events, args.messages);

  let system = CONTEXT_BASELINE_SYSTEM_TOKENS;
  let tools = CONTEXT_BASELINE_LOCAL_TOOLS_TOKENS;
  let mcp = mcpConnectors.size * CONTEXT_BASELINE_MCP_PER_CONNECTOR_TOKENS;
  let skills = 0;
  for (const id of loadedSkills) {
    skills += CONTEXT_BASELINE_SKILL_TOKENS[id] ?? 0;
  }
  let conversation = estimateConversationTokens(args.messages);

  const fixed = system + tools + mcp + skills;
  if (fixed >= inputTokens) {
    // Shrink fixed buckets proportionally; conversation becomes 0.
    const scale = inputTokens / fixed;
    system = Math.floor(system * scale);
    tools = Math.floor(tools * scale);
    mcp = Math.floor(mcp * scale);
    skills = Math.floor(skills * scale);
    conversation = 0;
  } else if (fixed + conversation > inputTokens) {
    conversation = Math.max(0, inputTokens - fixed);
  }

  const used = system + tools + mcp + skills + conversation;
  const other = Math.max(0, inputTokens - used);

  const categories: ContextCategoryTokens = {
    system,
    tools,
    mcp,
    skills,
    conversation,
    other,
  };

  // Absorb rounding drift into other so the bar always sums to inputTokens.
  const sum = CONTEXT_CATEGORY_KEYS.reduce((acc, key) => acc + categories[key], 0);
  if (sum !== inputTokens) {
    categories.other = Math.max(0, categories.other + (inputTokens - sum));
  }

  const ratio = inputTokens / contextWindowTokens;

  return {
    inputTokens,
    contextWindowTokens,
    ratio,
    percentFull: Math.min(100, Math.round(ratio * 100)),
    cacheReadTokens: fromEvents.cacheReadTokens,
    cacheWriteTokens: fromEvents.cacheWriteTokens,
    categories,
    estimated: true,
  };
}

export function contextCategoryLabel(key: ContextCategoryKey): string {
  switch (key) {
    case "system":
      return "System prompt";
    case "tools":
      return "Tool definitions";
    case "mcp":
      return "MCP & connectors";
    case "skills":
      return "Skills";
    case "conversation":
      return "Conversation";
    case "other":
      return "Other";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/** Stable display order for the segmented bar / legend (skip zero buckets optionally). */
export function contextCategoriesForDisplay(
  categories: ContextCategoryTokens,
  options?: { includeZero?: boolean },
): Array<{ key: ContextCategoryKey; tokens: number; label: string }> {
  const includeZero = options?.includeZero ?? false;
  return CONTEXT_CATEGORY_KEYS.filter(
    (key) => includeZero || categories[key] > 0,
  ).map((key) => ({
    key,
    tokens: categories[key],
    label: contextCategoryLabel(key),
  }));
}

export { emptyCategories };
