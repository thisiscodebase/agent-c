/** Default soft monthly cap per user (~£7.50 / $10). */
export const DEFAULT_USER_USAGE_LIMIT_USD = 10;

/** Fraction of the limit at which the composer shows a near-limit warning. */
export const USAGE_METER_WARN_RATIO = 0.8;

export const USAGE_LIMIT_REACHED_CODE = "USAGE_LIMIT_REACHED";

export type UsageMeterStatus = "ok" | "warn" | "blocked";

/** UTC calendar month key, e.g. `2026-08`. */
export function usagePeriodKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Instant the next UTC calendar month begins (exclusive end of current period). */
export function usagePeriodResetsAt(periodKey: string): number {
  const [yearRaw, monthRaw] = periodKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  }
  return Date.UTC(year, month, 1);
}

export function effectiveUsageLimitUsd(
  overrideUsd: number | null | undefined,
  companyDefaultUsd: number = DEFAULT_USER_USAGE_LIMIT_USD,
): number {
  if (typeof overrideUsd === "number" && Number.isFinite(overrideUsd) && overrideUsd > 0) {
    return overrideUsd;
  }
  if (
    typeof companyDefaultUsd === "number"
    && Number.isFinite(companyDefaultUsd)
    && companyDefaultUsd > 0
  ) {
    return companyDefaultUsd;
  }
  return DEFAULT_USER_USAGE_LIMIT_USD;
}

export function usageMeterStatus(usedUsd: number, limitUsd: number): UsageMeterStatus {
  if (limitUsd <= 0) {
    return "blocked";
  }
  if (usedUsd >= limitUsd) {
    return "blocked";
  }
  if (usedUsd / limitUsd >= USAGE_METER_WARN_RATIO) {
    return "warn";
  }
  return "ok";
}

export function usageMeterPercent(usedUsd: number, limitUsd: number): number {
  if (limitUsd <= 0) {
    return 100;
  }
  return Math.min(100, Math.max(0, (usedUsd / limitUsd) * 100));
}

export function isAppUserId(userId: string | null | undefined): userId is string {
  return Boolean(userId && !userId.startsWith("eve:"));
}

export const USAGE_LIMIT_REACHED_MESSAGE =
  "You've reached your monthly Agent C usage limit. Ask an admin if you need more, or wait until next month.";
