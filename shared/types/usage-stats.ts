export interface UsageHeatmapDay {
  date: string;
  value: number;
}

export interface UsageModelStat {
  modelId: string;
  label: string;
  tokens: number;
  agents: number;
  costUsd: number;
}

export interface UsageDailyPoint {
  date: string;
  tokens: number;
  agents: number;
  costUsd: number;
}

export interface UsageToolStat {
  /** Stable category key (e.g. slack, hubspot). */
  category: string;
  label: string;
  calls: number;
  /** Approximate LLM tokens from steps that requested tools in this category (equal-split). */
  tokens: number;
  /** Approximate LLM $ from steps that requested tools in this category (equal-split). */
  costUsd: number;
}

/** Per-tool-name breakdown within a category (admin drill-down). */
export interface UsageToolNameStat {
  toolName: string;
  label: string;
  calls: number;
  tokens: number;
  costUsd: number;
}

export type UsageThreadFlag = "high_steps" | "connector_spray";

export interface UsageThreadCategoryStat {
  category: string;
  label: string;
  calls: number;
}

export interface UsageThreadStat {
  threadId: string;
  title: string;
  totalTokens: number;
  totalCostUsd: number;
  toolCalls: number;
  turnCount: number;
  stepCount: number;
  /** Top tool categories in this thread by call count (max 3). */
  topCategories: UsageThreadCategoryStat[];
  flags: UsageThreadFlag[];
  createdAt: number;
  updatedAt: number;
  /**
   * When present (tool-category drill-down), LLM tokens/cost attributed to
   * that category within the thread (equal-split).
   */
  categoryTokens?: number;
  categoryCostUsd?: number;
}

/** Admin-only drill-down for one popular-tool category. */
export interface AdminToolCategoryDetail {
  category: string;
  label: string;
  calls: number;
  tokens: number;
  costUsd: number;
  tokensPerCall: number;
  /** Individual tool names within the category (incl. remapped discovery calls). */
  tools: UsageToolNameStat[];
  /** connection_search calls targeting this connector, when present. */
  discovery: {
    calls: number;
    tokens: number;
    costUsd: number;
  } | null;
  /** Threads that used this category, sorted by attributed cost. */
  threads: UsageThreadStat[];
}

export interface UserUsageStats {
  totalTokens: number;
  totalCostUsd: number;
  agentCount: number;
  longestAgentMs: number;
  currentStreakDays: number;
  longestStreakDays: number;
  joinedAt: number;
  heatmap: UsageHeatmapDay[];
  models: UsageModelStat[];
  daily: UsageDailyPoint[];
  tools: UsageToolStat[];
}

/** Public-facing stats: costs omitted. */
export interface PublicUserUsageStats {
  totalTokens: number;
  agentCount: number;
  longestAgentMs: number;
  currentStreakDays: number;
  longestStreakDays: number;
  joinedAt: number;
  heatmap: UsageHeatmapDay[];
  models: Array<Omit<UsageModelStat, "costUsd">>;
  daily: Array<Omit<UsageDailyPoint, "costUsd">>;
  tools: Array<Omit<UsageToolStat, "costUsd">>;
}

export interface PublicUserProfile {
  name: string;
  handle: string;
  image: string | null;
  bio: string;
  createdAt: number;
  isOwn: boolean;
  stats: PublicUserUsageStats;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  image: string | null;
  totalTokens: number;
  agentCount: number;
}

export interface CompanyProfile {
  name: string;
  userCount: number;
  createdAt: number;
  stats: PublicUserUsageStats;
  leaderboard: LeaderboardEntry[];
}

export interface AdminLeaderboardEntry extends LeaderboardEntry {
  totalCostUsd: number;
}

export interface AdminCompanyProfile {
  name: string;
  userCount: number;
  createdAt: number;
  stats: UserUsageStats;
  leaderboard: AdminLeaderboardEntry[];
}

export interface AdminUserDetail {
  name: string;
  handle: string;
  image: string | null;
  email: string;
  createdAt: number;
  stats: UserUsageStats;
  threads: UsageThreadStat[];
}
