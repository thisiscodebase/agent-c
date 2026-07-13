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

export interface UsageThreadStat {
  threadId: string;
  title: string;
  totalTokens: number;
  totalCostUsd: number;
  toolCalls: number;
  createdAt: number;
  updatedAt: number;
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
