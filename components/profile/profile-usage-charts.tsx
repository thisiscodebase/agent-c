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
import type { UsageDailyPoint } from "#shared/types/usage-stats";
import { formatChartDayLabel, formatTokenCount } from "~/lib/format-usage";

function chartRows(daily: UsageDailyPoint[]) {
  return daily.map((point) => ({
    ...point,
    label: formatChartDayLabel(point.date),
  }));
}

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

export function ProfileTokensChart({
  daily,
  totalTokens,
}: {
  daily: UsageDailyPoint[];
  totalTokens: number;
}) {
  const data = chartRows(daily);
  const config = {
    tokens: { label: "Tokens", color: "orange" as const },
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Tokens</h2>
        <p className="text-2xl font-semibold tracking-tight">
          {formatTokenCount(totalTokens)}{" "}
          <span className="text-base font-normal text-muted-foreground">tokens</span>
        </p>
      </div>
      <div className="h-48 w-full">
        <AreaChart bloom="low" config={config} data={data} margins={{ top: 8, right: 8, bottom: 22, left: 40 }}>
          <Grid horizontal />
          <XAxis dataKey="label" maxTicks={xAxisMaxTicks(data.length)} />
          <YAxis tickFormatter={formatTokenCount} />
          <Area dataKey="tokens" variant="gradient" />
          <Tooltip labelKey="label" valueFormatter={(value) => formatTokenCount(value)} />
        </AreaChart>
      </div>
    </section>
  );
}

export function ProfileAgentsChart({
  daily,
  agentCount,
}: {
  daily: UsageDailyPoint[];
  agentCount: number;
}) {
  const data = chartRows(daily);
  const config = {
    agents: { label: "Agents", color: "orange" as const },
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Agents</h2>
        <p className="text-2xl font-semibold tracking-tight">
          {agentCount}{" "}
          <span className="text-base font-normal text-muted-foreground">agents</span>
        </p>
      </div>
      <div className="h-48 w-full">
        <BarChart bloom="low" config={config} data={data} margins={{ top: 8, right: 8, bottom: 22, left: 28 }}>
          <Grid horizontal />
          <XAxis dataKey="label" maxTicks={xAxisMaxTicks(data.length)} />
          <YAxis />
          <Bar dataKey="agents" variant="gradient" />
          <Tooltip labelKey="label" />
        </BarChart>
      </div>
    </section>
  );
}
