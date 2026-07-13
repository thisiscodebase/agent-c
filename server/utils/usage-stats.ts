import type { ThreadState } from "#shared/types/thread";
import type {
  UsageDailyPoint,
  UsageHeatmapDay,
  UsageModelStat,
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

function modelLabel(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  const raw = slash >= 0 ? modelId.slice(slash + 1) : modelId;
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
  createdAt: number;
  updatedAt: number;
  state: ThreadState | null;
}

export function aggregateUsageStats(
  threads: ThreadUsageInput[],
  joinedAt: number,
  now = Date.now(),
): UserUsageStats {
  let totalTokens = 0;
  let totalCostUsd = 0;
  let longestAgentMs = 0;

  const activityByDay = new Map<string, number>();
  const tokensByDay = new Map<string, number>();
  const agentIdsByDay = new Map<string, Set<string>>();
  const modelTokens = new Map<string, number>();
  const modelAgents = new Map<string, number>();

  function markAgentDay(day: string, threadId: string) {
    let set = agentIdsByDay.get(day);
    if (!set) {
      set = new Set();
      agentIdsByDay.set(day, set);
    }
    set.add(threadId);
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

      if (event.type === "step.completed") {
        const usage = readUsage(event.data);
        const tokens = stepTokens(usage);
        totalTokens += tokens;
        totalCostUsd += usage?.costUsd ?? 0;

        if (at !== null) {
          const day = formatLocalDate(at);
          tokensByDay.set(day, (tokensByDay.get(day) ?? 0) + tokens);
          if (!activityByDay.has(day)) {
            activityByDay.set(day, 1);
          }
          markAgentDay(day, thread.id);
          sawActivity = true;
        }

        if (currentModelId && tokens > 0) {
          modelTokens.set(currentModelId, (modelTokens.get(currentModelId) ?? 0) + tokens);
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
    }

    if (threadStart !== null && threadEnd !== null) {
      longestAgentMs = Math.max(longestAgentMs, Math.max(0, threadEnd - threadStart));
    } else {
      longestAgentMs = Math.max(longestAgentMs, Math.max(0, thread.updatedAt - thread.createdAt));
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

  // Charts start at join/first activity so empty pre-project months don't dominate.
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
    });
  }

  const models: UsageModelStat[] = [...modelTokens.entries()]
    .map(([modelId, tokens]) => ({
      modelId,
      label: modelLabel(modelId),
      tokens,
      agents: modelAgents.get(modelId) ?? 0,
    }))
    .sort((a, b) => b.tokens - a.tokens || b.agents - a.agents)
    .slice(0, 8);

  return {
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
  };
}
