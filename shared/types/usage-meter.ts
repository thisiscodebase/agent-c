import type { UsageMeterStatus } from "../usage-meter";

export interface UsageMeterSettings {
  defaultLimitUsd: number;
  updatedAt: number | null;
}

export interface UsageMeterSnapshot {
  usedUsd: number;
  limitUsd: number;
  /** Effective limit may come from a per-user override; null means company default. */
  limitOverrideUsd: number | null;
  /** Company-wide default currently in effect when no override is set. */
  defaultLimitUsd: number;
  percent: number;
  status: UsageMeterStatus;
  periodKey: string;
  resetsAt: number;
}

export interface AdminUsageMeterRow {
  userId: string;
  name: string;
  handle: string;
  email: string;
  image: string | null;
  usedUsd: number;
  limitUsd: number;
  limitOverrideUsd: number | null;
  percent: number;
  status: UsageMeterStatus;
  periodKey: string;
}
