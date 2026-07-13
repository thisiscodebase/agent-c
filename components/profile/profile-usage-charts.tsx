"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Grid,
  Tooltip,
  XAxis,
  YAxis,
} from "~/components/dither-kit";
import type { UsageMetric } from "#shared/types/usage-metric";
import { usageMetricLabel } from "#shared/types/usage-metric";
import {
  formatChartDayLabel,
  formatCostUsd,
  formatTokenCount,
} from "~/lib/format-usage";

const TOKENS_CHART_CONFIG = {
  tokens: { label: "Tokens", color: "orange" as const },
};

const COST_CHART_CONFIG = {
  costUsd: { label: "Cost", color: "orange" as const },
};

const AGENTS_CHART_CONFIG = {
  agents: { label: "Agents", color: "orange" as const },
};

function xAxisMaxTicks(pointCount: number) {
  if (pointCount <= 8) {
    return pointCount;
  }
  if (pointCount <= 14) {
    return 7;
  }
  if (pointCount <= 31) {
    return 8;
  }
  return 6;
}

type DailyPoint = {
  date: string;
  tokens: number;
  agents: number;
  costUsd?: number;
};

export function ProfileUsageChart({
  metric,
  daily,
  totalTokens,
  agentCount,
  totalCostUsd = 0,
}: {
  metric: UsageMetric;
  daily: DailyPoint[];
  totalTokens: number;
  agentCount: number;
  totalCostUsd?: number;
}) {
  const data = daily.map((point) => ({
    ...point,
    label: formatChartDayLabel(point.date),
  }));

  switch (metric) {
    case "cost":
      return (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">{usageMetricLabel(metric)}</h2>
            <p className="text-2xl font-semibold tracking-tight">
              {formatCostUsd(totalCostUsd)}{" "}
              <span className="text-base font-normal text-muted-foreground">USD</span>
            </p>
          </div>
          <div className="h-48 w-full">
            <AreaChart
              bloom="low"
              config={COST_CHART_CONFIG}
              data={data}
              margins={{ top: 8, right: 8, bottom: 22, left: 40 }}
            >
              <Grid horizontal />
              <XAxis dataKey="label" maxTicks={xAxisMaxTicks(data.length)} />
              <YAxis tickFormatter={(value) => formatCostUsd(value)} />
              <Area dataKey="costUsd" variant="gradient" />
              <Tooltip labelKey="label" valueFormatter={(value) => formatCostUsd(value)} />
            </AreaChart>
          </div>
        </section>
      );
    case "tokens":
      return (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">{usageMetricLabel(metric)}</h2>
            <p className="text-2xl font-semibold tracking-tight">
              {formatTokenCount(totalTokens)}{" "}
              <span className="text-base font-normal text-muted-foreground">tokens</span>
            </p>
          </div>
          <div className="h-48 w-full">
            <AreaChart
              bloom="low"
              config={TOKENS_CHART_CONFIG}
              data={data}
              margins={{ top: 8, right: 8, bottom: 22, left: 40 }}
            >
              <Grid horizontal />
              <XAxis dataKey="label" maxTicks={xAxisMaxTicks(data.length)} />
              <YAxis tickFormatter={formatTokenCount} />
              <Area dataKey="tokens" variant="gradient" />
              <Tooltip labelKey="label" valueFormatter={(value) => formatTokenCount(value)} />
            </AreaChart>
          </div>
        </section>
      );
    case "agents":
      return (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-medium">{usageMetricLabel(metric)}</h2>
            <p className="text-2xl font-semibold tracking-tight">
              {agentCount}{" "}
              <span className="text-base font-normal text-muted-foreground">agents</span>
            </p>
          </div>
          <div className="h-48 w-full">
            <BarChart
              bloom="low"
              config={AGENTS_CHART_CONFIG}
              data={data}
              margins={{ top: 8, right: 8, bottom: 22, left: 28 }}
            >
              <Grid horizontal />
              <XAxis dataKey="label" maxTicks={xAxisMaxTicks(data.length)} />
              <YAxis />
              <Bar dataKey="agents" variant="gradient" />
              <Tooltip labelKey="label" />
            </BarChart>
          </div>
        </section>
      );
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}
