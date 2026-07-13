export interface UsageHeatmapDay {
  date: string;
  value: number;
}

export interface UsageModelStat {
  modelId: string;
  label: string;
  tokens: number;
  agents: number;
}

export interface UsageDailyPoint {
  date: string;
  tokens: number;
  agents: number;
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
}

export interface PublicUserProfile {
  name: string;
  handle: string;
  image: string | null;
  bio: string;
  createdAt: number;
  isOwn: boolean;
  stats: UserUsageStats;
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
  stats: UserUsageStats;
  leaderboard: LeaderboardEntry[];
}
