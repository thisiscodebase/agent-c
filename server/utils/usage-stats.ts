import type { ThreadState } from "#shared/types/thread";
import { toolCategory } from "#shared/tool-category";
import type {
  PublicUserUsageStats,
  UsageDailyPoint,
  UsageHeatmapDay,
  UsageModelStat,
  UsageThreadStat,
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

const CHART_DAYS_MAX = 90;
const CHART_DAYS_MIN = 7;
const HEATMAP_DAYS_MAX = 365;
const TOP_MODELS = 10;
const TOP_TOOLS = 10;

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

function readStepIndex(data: Record<string, unknown> | undefined): number | null {
  const raw = data?.stepIndex;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readToolNamesFromActions(data: Record<string, unknown> | undefined): string[] {
  const actions = data?.actions;
  if (!Array.isArray(actions)) {
    return [];
  }

  const names: string[] = [];
  for (const action of actions) {
    if (!action || typeof action !== "object") {
      continue;
    }
    const toolName = (action as { toolName?: unknown }).toolName;
    if (typeof toolName === "string" && toolName.length > 0) {
      names.push(toolName);
    }
  }
  return names;
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
    /** Tools requested on each stepIndex within this thread. */
    const toolsByStep = new Map<number, string[]>();

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

      if (event.type === "turn.started" && at !== null) {
        const day = formatLocalDate(at);
        activityByDay.set(day, (activityByDay.get(day) ?? 0) + 1);
        markAgentDay(day, thread.id);
        sawActivity = true;
      }

      if (event.type === "actions.requested") {
        const stepIndex = readStepIndex(event.data);
        const names = readToolNamesFromActions(event.data);
        if (stepIndex !== null && names.length > 0) {
          toolsByStep.set(stepIndex, names);
          threadToolCalls += names.length;
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
        const names = stepIndex !== null ? toolsByStep.get(stepIndex) : undefined;
        if (names && names.length > 0) {
          const costShare = cost / names.length;
          const tokenShare = tokens / names.length;
          for (const name of names) {
            bumpTool(name, 1, tokenShare, costShare);
          }
        }
      }
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
        totalTokens: threadTokens,
        totalCostUsd: threadCost,
        toolCalls: threadToolCalls,
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
