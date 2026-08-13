import { isSlackThreadId, type ThreadState } from "#shared/types/thread";
import {
  categoryLabel,
  toolCategory,
  toolCategoryForCall,
} from "#shared/tool-category";
import type {
  AdminToolCategoryDetail,
  PublicUserUsageStats,
  UsageDailyPoint,
  UsageHeatmapDay,
  UsageModelStat,
  UsageThreadCategoryStat,
  UsageThreadFlag,
  UsageThreadStat,
  UsageToolNameStat,
  UsageToolStat,
  UserUsageStats,
} from "#shared/types/usage-stats";

interface EventMeta {
  at?: string;
}

interface StepUsage {
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

interface TypedEvent {
  type: string;
  meta?: EventMeta;
  data?: Record<string, unknown>;
}

interface ToolCallRef {
  toolName: string;
  connection: string | null;
}

const CHART_DAYS_MAX = 90;
const CHART_DAYS_MIN = 7;
const HEATMAP_DAYS_MAX = 365;
const TOP_MODELS = 10;
const TOP_TOOLS = 10;
const TOP_THREAD_CATEGORIES = 3;
const HIGH_STEPS_THRESHOLD = 8;
const CONNECTOR_SPRAY_THRESHOLD = 3;
const TOP_CATEGORY_THREADS = 25;
const TOP_TOOL_NAMES = 30;

function asEvent(value: unknown): TypedEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as { type?: unknown; meta?: unknown; data?: unknown };
  if (typeof event.type !== "string") {
    return null;
  }

  return {
    type: event.type,
    meta: event.meta && typeof event.meta === "object" ? (event.meta as EventMeta) : undefined,
    data:
      event.data && typeof event.data === "object"
        ? (event.data as Record<string, unknown>)
        : undefined,
  };
}

function eventTime(event: TypedEvent): number | null {
  const at = event.meta?.at;
  if (!at) {
    return null;
  }
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? ms : null;
}

function formatLocalDate(ms: number): string {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function stepTokens(usage: StepUsage | undefined): number {
  if (!usage) {
    return 0;
  }
  return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
}

function readUsage(data: Record<string, unknown> | undefined): StepUsage | undefined {
  const usage = data?.usage;
  if (!usage || typeof usage !== "object") {
    return undefined;
  }
  return usage as StepUsage;
}

function readTurnId(data: Record<string, unknown> | undefined): string | null {
  const raw = data?.turnId;
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  return raw;
}

function stepKey(turnId: string | null, stepIndex: number): string {
  return `${turnId ?? "_"}:${stepIndex}`;
}

function readStepIndex(data: Record<string, unknown> | undefined): number | null {
  const raw = data?.stepIndex;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return null;
  }
  return null;
}

function readConnection(input: unknown): string | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const connection = (input as { connection?: unknown }).connection;
  if (typeof connection !== "string" || connection.length === 0) {
    return null;
  }
  return connection;
}

function readToolCallsFromActions(data: Record<string, unknown> | undefined): ToolCallRef[] {
  const actions = data?.actions;
  if (!Array.isArray(actions)) {
    return [];
  }

  const calls: ToolCallRef[] = [];
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

function isDiscoveryCall(call: ToolCallRef): boolean {
  const name = call.toolName.toLowerCase();
  return name === "connection_search" || name.includes("connection_search");
}

function toolNameLabel(toolName: string): string {
  if (isDiscoveryCall({ toolName, connection: null })) {
    return "connection_search";
  }
  const bare = toolName.split(/[:/]/).at(-1) ?? toolName;
  return bare.replace(/^[^_]+__/, "");
}

function modelLabel(modelId: string): string {
  const cleaned = modelId.replace(/^dynamic:/, "");
  const slash = cleaned.lastIndexOf("/");
  const raw = slash >= 0 ? cleaned.slice(slash + 1) : cleaned;
  return raw
    .split("-")
    .map((part) => {
      if (part.length <= 3 && /[a-z]/.test(part) && /\d/.test(part)) {
        return part.toUpperCase();
      }
      if (/^\d+(\.\d+)?$/.test(part)) {
        return part;
      }
      return part[0]!.toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function computeStreaks(activeDays: Set<string>, todayKey: string): {
  currentStreakDays: number;
  longestStreakDays: number;
} {
  if (activeDays.size === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  const sorted = [...activeDays].sort();
  let longest = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00`);
    const curr = new Date(`${sorted[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  const cursor = new Date(`${todayKey}T00:00:00`);
  if (!activeDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (activeDays.has(formatLocalDate(cursor.getTime()))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { currentStreakDays: current, longestStreakDays: Math.max(longest, current) };
}

function buildTopCategories(
  categoryCalls: Map<string, { label: string; calls: number }>,
): UsageThreadCategoryStat[] {
  return [...categoryCalls.entries()]
    .map(([category, value]) => ({
      category,
      label: value.label,
      calls: value.calls,
    }))
    .sort((a, b) => b.calls - a.calls || a.label.localeCompare(b.label))
    .slice(0, TOP_THREAD_CATEGORIES);
}

function buildThreadFlags(
  stepCount: number,
  firstTurnCategories: Set<string>,
): UsageThreadFlag[] {
  const flags: UsageThreadFlag[] = [];
  if (stepCount >= HIGH_STEPS_THRESHOLD) {
    flags.push("high_steps");
  }
  if (firstTurnCategories.size >= CONNECTOR_SPRAY_THRESHOLD) {
    flags.push("connector_spray");
  }
  return flags;
}

function threadSource(
  thread: ThreadUsageInput,
): "web" | "slack" {
  if (thread.state?.source === "slack" || isSlackThreadId(thread.id)) {
    return "slack";
  }
  return "web";
}

export interface ThreadUsageInput {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  state: ThreadState | null;
}

export interface AggregateUsageOptions {
  /** When true, return per-thread breakdowns (admin user drill-down). */
  includeThreads?: boolean;
}

export function toPublicUsageStats(stats: UserUsageStats): PublicUserUsageStats {
  return {
    totalTokens: stats.totalTokens,
    agentCount: stats.agentCount,
    longestAgentMs: stats.longestAgentMs,
    currentStreakDays: stats.currentStreakDays,
    longestStreakDays: stats.longestStreakDays,
    joinedAt: stats.joinedAt,
    heatmap: stats.heatmap,
    models: stats.models.map(({ modelId, label, tokens, agents }) => ({
      modelId,
      label,
      tokens,
      agents,
    })),
    daily: stats.daily.map(({ date, tokens, agents }) => ({ date, tokens, agents })),
    tools: stats.tools.map(({ category, label, calls, tokens }) => ({
      category,
      label,
      calls,
      tokens,
    })),
  };
}

export function aggregateUsageStats(
  threads: ThreadUsageInput[],
  joinedAt: number,
  now = Date.now(),
  options: AggregateUsageOptions = {},
): UserUsageStats & { threads?: UsageThreadStat[] } {
  let totalTokens = 0;
  let totalCostUsd = 0;
  let longestAgentMs = 0;

  const activityByDay = new Map<string, number>();
  const tokensByDay = new Map<string, number>();
  const costByDay = new Map<string, number>();
  const agentIdsByDay = new Map<string, Set<string>>();
  const modelTokens = new Map<string, number>();
  const modelCost = new Map<string, number>();
  const modelAgents = new Map<string, number>();
  const toolCalls = new Map<
    string,
    { label: string; calls: number; tokens: number; costUsd: number }
  >();
  const threadStats: UsageThreadStat[] = [];

  function markAgentDay(day: string, threadId: string) {
    let set = agentIdsByDay.get(day);
    if (!set) {
      set = new Set();
      agentIdsByDay.set(day, set);
    }
    set.add(threadId);
  }

  function bumpTool(toolName: string, calls: number, tokens: number, costUsd: number) {
    const { category, label } = toolCategory(toolName);
    // Meta lookup for other tools — not a real usage source on the leaderboard.
    if (category === "connections") {
      return;
    }
    const existing = toolCalls.get(category);
    if (existing) {
      existing.calls += calls;
      existing.tokens += tokens;
      existing.costUsd += costUsd;
      return;
    }
    toolCalls.set(category, { label, calls, tokens, costUsd });
  }

  for (const thread of threads) {
    const events = (thread.state?.events ?? [])
      .map(asEvent)
      .filter((event): event is TypedEvent => event !== null);

    let threadStart: number | null = null;
    let threadEnd: number | null = null;
    let currentModelId: string | null = null;
    const modelsInThread = new Set<string>();
    let sawActivity = false;

    let threadTokens = 0;
    let threadCost = 0;
    let threadToolCalls = 0;
    let turnCount = 0;
    let stepCount = 0;
    let turnIndex = -1;
    const categoryCalls = new Map<string, { label: string; calls: number }>();
    const firstTurnCategories = new Set<string>();
    /** Tools requested on each turnId:stepIndex within this thread. */
    const toolsByStep = new Map<string, ToolCallRef[]>();

    for (const event of events) {
      const at = eventTime(event);
      if (at !== null) {
        threadStart = threadStart === null ? at : Math.min(threadStart, at);
        threadEnd = threadEnd === null ? at : Math.max(threadEnd, at);
      }

      if (event.type === "session.started") {
        const runtime = event.data?.runtime;
        if (runtime && typeof runtime === "object") {
          const modelId = (runtime as { modelId?: unknown }).modelId;
          if (typeof modelId === "string" && modelId.length > 0) {
            currentModelId = modelId;
            modelsInThread.add(modelId);
          }
        }
      }

      if (event.type === "turn.started") {
        turnCount += 1;
        turnIndex += 1;
        if (at !== null) {
          const day = formatLocalDate(at);
          activityByDay.set(day, (activityByDay.get(day) ?? 0) + 1);
          markAgentDay(day, thread.id);
          sawActivity = true;
        }
      }

      if (event.type === "step.started") {
        stepCount += 1;
      }

      if (event.type === "actions.requested") {
        const stepIndex = readStepIndex(event.data);
        const turnId = readTurnId(event.data);
        const calls = readToolCallsFromActions(event.data);
        if (stepIndex !== null && calls.length > 0) {
          const key = stepKey(turnId, stepIndex);
          const prev = toolsByStep.get(key) ?? [];
          toolsByStep.set(key, [...prev, ...calls]);
          threadToolCalls += calls.length;
          for (const call of calls) {
            const { category, label } = toolCategoryForCall(call.toolName, call.connection);
            if (category === "connections") {
              continue;
            }
            const existing = categoryCalls.get(category);
            if (existing) {
              existing.calls += 1;
            } else {
              categoryCalls.set(category, { label, calls: 1 });
            }
            if (turnIndex === 0) {
              firstTurnCategories.add(category);
            }
          }
        }
      }

      if (event.type === "step.completed") {
        const usage = readUsage(event.data);
        const tokens = stepTokens(usage);
        const cost = usage?.costUsd ?? 0;
        totalTokens += tokens;
        totalCostUsd += cost;
        threadTokens += tokens;
        threadCost += cost;

        if (at !== null) {
          const day = formatLocalDate(at);
          tokensByDay.set(day, (tokensByDay.get(day) ?? 0) + tokens);
          costByDay.set(day, (costByDay.get(day) ?? 0) + cost);
          if (!activityByDay.has(day)) {
            activityByDay.set(day, 1);
          }
          markAgentDay(day, thread.id);
          sawActivity = true;
        }

        if (currentModelId && (tokens > 0 || cost > 0)) {
          modelTokens.set(currentModelId, (modelTokens.get(currentModelId) ?? 0) + tokens);
          modelCost.set(currentModelId, (modelCost.get(currentModelId) ?? 0) + cost);
        }

        const stepIndex = readStepIndex(event.data);
        const turnId = readTurnId(event.data);
        const calls =
          stepIndex !== null ? toolsByStep.get(stepKey(turnId, stepIndex)) : undefined;
        if (calls && calls.length > 0) {
          const costShare = cost / calls.length;
          const tokenShare = tokens / calls.length;
          for (const call of calls) {
            bumpTool(call.toolName, 1, tokenShare, costShare);
          }
        }
      }
    }

    // If the runtime only emitted step.completed (no step.started), derive stepCount.
    if (stepCount === 0 && toolsByStep.size > 0) {
      stepCount = toolsByStep.size;
    }
    if (stepCount === 0) {
      let completedSteps = 0;
      for (const event of events) {
        if (event.type === "step.completed") {
          completedSteps += 1;
        }
      }
      stepCount = completedSteps;
    }

    if (!sawActivity) {
      const day = formatLocalDate(thread.updatedAt || thread.createdAt);
      activityByDay.set(day, (activityByDay.get(day) ?? 0) + 1);
      markAgentDay(day, thread.id);
    }

    for (const modelId of modelsInThread) {
      modelAgents.set(modelId, (modelAgents.get(modelId) ?? 0) + 1);
      if (!modelTokens.has(modelId)) {
        modelTokens.set(modelId, 0);
      }
      if (!modelCost.has(modelId)) {
        modelCost.set(modelId, 0);
      }
    }

    if (threadStart !== null && threadEnd !== null) {
      longestAgentMs = Math.max(longestAgentMs, Math.max(0, threadEnd - threadStart));
    } else {
      longestAgentMs = Math.max(longestAgentMs, Math.max(0, thread.updatedAt - thread.createdAt));
    }

    if (options.includeThreads) {
      threadStats.push({
        threadId: thread.id,
        title: thread.title?.trim() || "Untitled",
        source: threadSource(thread),
        totalTokens: threadTokens,
        totalCostUsd: threadCost,
        toolCalls: threadToolCalls,
        turnCount,
        stepCount,
        topCategories: buildTopCategories(categoryCalls),
        flags: buildThreadFlags(stepCount, firstTurnCategories),
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      });
    }
  }

  const todayKey = formatLocalDate(now);
  const { currentStreakDays, longestStreakDays } = computeStreaks(
    new Set(activityByDay.keys()),
    todayKey,
  );

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const joinedDay = new Date(joinedAt);
  joinedDay.setHours(0, 0, 0, 0);

  const activityKeys = [...activityByDay.keys(), ...tokensByDay.keys()].sort();
  const firstActivityDay = activityKeys[0]
    ? new Date(`${activityKeys[0]}T00:00:00`)
    : joinedDay;

  const rangeStart = new Date(Math.min(joinedDay.getTime(), firstActivityDay.getTime()));
  const daysSinceStart = Math.max(
    0,
    Math.round((today.getTime() - rangeStart.getTime()) / 86_400_000),
  );
  const chartSpan = Math.min(
    CHART_DAYS_MAX,
    Math.max(CHART_DAYS_MIN, daysSinceStart + 1),
  );
  const heatmapSpan = Math.min(HEATMAP_DAYS_MAX, Math.max(CHART_DAYS_MIN, daysSinceStart + 1));

  const heatmap: UsageHeatmapDay[] = [];
  for (let i = heatmapSpan - 1; i >= 0; i--) {
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() - i);
    const date = formatLocalDate(cursor.getTime());
    heatmap.push({ date, value: activityByDay.get(date) ?? 0 });
  }

  const daily: UsageDailyPoint[] = [];
  for (let i = chartSpan - 1; i >= 0; i--) {
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() - i);
    const date = formatLocalDate(cursor.getTime());
    daily.push({
      date,
      tokens: tokensByDay.get(date) ?? 0,
      agents: agentIdsByDay.get(date)?.size ?? 0,
      costUsd: costByDay.get(date) ?? 0,
    });
  }

  const models: UsageModelStat[] = [...modelTokens.entries()]
    .map(([modelId, tokens]) => ({
      modelId,
      label: modelLabel(modelId),
      tokens,
      agents: modelAgents.get(modelId) ?? 0,
      costUsd: modelCost.get(modelId) ?? 0,
    }))
    .sort((a, b) => b.tokens - a.tokens || b.costUsd - a.costUsd || b.agents - a.agents)
    .slice(0, TOP_MODELS);

  const tools: UsageToolStat[] = [...toolCalls.entries()]
    .map(([category, value]) => ({
      category,
      label: value.label,
      calls: value.calls,
      tokens: value.tokens,
      costUsd: value.costUsd,
    }))
    .sort((a, b) => b.calls - a.calls || b.tokens - a.tokens || b.costUsd - a.costUsd)
    .slice(0, TOP_TOOLS);

  const result: UserUsageStats & { threads?: UsageThreadStat[] } = {
    totalTokens,
    totalCostUsd,
    agentCount: threads.length,
    longestAgentMs,
    currentStreakDays,
    longestStreakDays,
    joinedAt,
    heatmap,
    models,
    daily,
    tools,
  };

  if (options.includeThreads) {
    result.threads = threadStats.sort(
      (a, b) => b.totalCostUsd - a.totalCostUsd || b.totalTokens - a.totalTokens,
    );
  }

  return result;
}

/**
 * Admin drill-down for one tool category across company threads.
 * Includes remapped `connection_search` discovery calls for that connector.
 */
export function aggregateToolCategoryDetail(
  threads: ThreadUsageInput[],
  category: string,
): AdminToolCategoryDetail {
  const label = categoryLabel(category);
  let calls = 0;
  let tokens = 0;
  let costUsd = 0;
  let discoveryCalls = 0;
  let discoveryTokens = 0;
  let discoveryCost = 0;

  const byToolName = new Map<
    string,
    { label: string; calls: number; tokens: number; costUsd: number }
  >();
  const matchingThreads: UsageThreadStat[] = [];

  function bumpName(
    toolName: string,
    shareCalls: number,
    shareTokens: number,
    shareCost: number,
  ) {
    const existing = byToolName.get(toolName);
    if (existing) {
      existing.calls += shareCalls;
      existing.tokens += shareTokens;
      existing.costUsd += shareCost;
      return;
    }
    byToolName.set(toolName, {
      label: toolNameLabel(toolName),
      calls: shareCalls,
      tokens: shareTokens,
      costUsd: shareCost,
    });
  }

  for (const thread of threads) {
    const events = (thread.state?.events ?? [])
      .map(asEvent)
      .filter((event): event is TypedEvent => event !== null);

    let threadTokens = 0;
    let threadCost = 0;
    let threadToolCalls = 0;
    let turnCount = 0;
    let stepCount = 0;
    let turnIndex = -1;
    let categoryHits = 0;
    let categoryAttributedTokens = 0;
    let categoryAttributedCost = 0;
    const categoryCalls = new Map<string, { label: string; calls: number }>();
    const firstTurnCategories = new Set<string>();
    const toolsByStep = new Map<string, ToolCallRef[]>();

    for (const event of events) {
      if (event.type === "turn.started") {
        turnCount += 1;
        turnIndex += 1;
      }

      if (event.type === "step.started") {
        stepCount += 1;
      }

      if (event.type === "actions.requested") {
        const stepIndex = readStepIndex(event.data);
        const turnId = readTurnId(event.data);
        const stepCalls = readToolCallsFromActions(event.data);
        if (stepIndex !== null && stepCalls.length > 0) {
          const key = stepKey(turnId, stepIndex);
          const prev = toolsByStep.get(key) ?? [];
          toolsByStep.set(key, [...prev, ...stepCalls]);
          threadToolCalls += stepCalls.length;
          for (const call of stepCalls) {
            const resolved = toolCategoryForCall(call.toolName, call.connection);
            if (resolved.category === "connections") {
              continue;
            }
            const existing = categoryCalls.get(resolved.category);
            if (existing) {
              existing.calls += 1;
            } else {
              categoryCalls.set(resolved.category, {
                label: resolved.label,
                calls: 1,
              });
            }
            if (turnIndex === 0) {
              firstTurnCategories.add(resolved.category);
            }
            if (resolved.category === category) {
              categoryHits += 1;
            }
          }
        }
      }

      if (event.type === "step.completed") {
        const usage = readUsage(event.data);
        const stepTok = stepTokens(usage);
        const stepCost = usage?.costUsd ?? 0;
        threadTokens += stepTok;
        threadCost += stepCost;

        const stepIndex = readStepIndex(event.data);
        const turnId = readTurnId(event.data);
        const stepCalls =
          stepIndex !== null ? toolsByStep.get(stepKey(turnId, stepIndex)) : undefined;
        if (!stepCalls || stepCalls.length === 0) {
          continue;
        }

        const tokenShare = stepTok / stepCalls.length;
        const costShare = stepCost / stepCalls.length;

        for (const call of stepCalls) {
          const resolved = toolCategoryForCall(call.toolName, call.connection);
          if (resolved.category !== category) {
            continue;
          }

          calls += 1;
          tokens += tokenShare;
          costUsd += costShare;
          categoryAttributedTokens += tokenShare;
          categoryAttributedCost += costShare;
          bumpName(call.toolName, 1, tokenShare, costShare);

          if (isDiscoveryCall(call)) {
            discoveryCalls += 1;
            discoveryTokens += tokenShare;
            discoveryCost += costShare;
          }
        }
      }
    }

    if (stepCount === 0 && toolsByStep.size > 0) {
      stepCount = toolsByStep.size;
    }
    if (stepCount === 0) {
      for (const event of events) {
        if (event.type === "step.completed") {
          stepCount += 1;
        }
      }
    }

    if (categoryHits > 0) {
      matchingThreads.push({
        threadId: thread.id,
        title: thread.title?.trim() || "Untitled",
        source: threadSource(thread),
        totalTokens: threadTokens,
        totalCostUsd: threadCost,
        toolCalls: threadToolCalls,
        turnCount,
        stepCount,
        topCategories: buildTopCategories(categoryCalls),
        flags: buildThreadFlags(stepCount, firstTurnCategories),
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        categoryTokens: categoryAttributedTokens,
        categoryCostUsd: categoryAttributedCost,
      });
    }
  }

  const tools: UsageToolNameStat[] = [...byToolName.entries()]
    .map(([toolName, value]) => ({
      toolName,
      label: value.label,
      calls: value.calls,
      tokens: value.tokens,
      costUsd: value.costUsd,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || b.tokens - a.tokens || b.calls - a.calls)
    .slice(0, TOP_TOOL_NAMES);

  matchingThreads.sort(
    (a, b) =>
      (b.categoryCostUsd ?? 0) - (a.categoryCostUsd ?? 0)
      || (b.categoryTokens ?? 0) - (a.categoryTokens ?? 0)
      || b.totalCostUsd - a.totalCostUsd,
  );

  return {
    category,
    label,
    calls,
    tokens,
    costUsd,
    tokensPerCall: calls > 0 ? tokens / calls : 0,
    tools,
    discovery:
      discoveryCalls > 0
        ? {
            calls: discoveryCalls,
            tokens: discoveryTokens,
            costUsd: discoveryCost,
          }
        : null,
    threads: matchingThreads.slice(0, TOP_CATEGORY_THREADS),
  };
}
