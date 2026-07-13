export type UsageMetric = "cost" | "tokens" | "agents";

export const PUBLIC_USAGE_METRICS: UsageMetric[] = ["agents", "tokens"];
export const ADMIN_USAGE_METRICS: UsageMetric[] = ["agents", "tokens", "cost"];

export function usageMetricLabel(metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return "Cost";
    case "tokens":
      return "Tokens";
    case "agents":
      return "Agents";
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}
