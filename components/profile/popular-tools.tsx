"use client";

import { useMemo } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import type { UsageToolStat } from "#shared/types/usage-stats";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";
import { splitRankedColumns } from "~/lib/ranked-columns";
import { cn } from "~/lib/utils";
import { getBrandAccentClass, getToolCategoryIcon } from "~/lib/tool-icons";

type ToolRow = Pick<UsageToolStat, "category" | "label" | "calls" | "tokens"> & {
  costUsd?: number;
};

function toolMetricValue(tool: ToolRow, metric: UsageMetric): number {
  switch (metric) {
    case "cost":
      return tool.costUsd ?? 0;
    case "tokens":
      return tool.tokens;
    case "agents":
      return tool.calls;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function formatToolMetric(tool: ToolRow, metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return formatCostUsd(tool.costUsd ?? 0);
    case "tokens":
      return formatTokenCount(tool.tokens);
    case "agents":
      return String(tool.calls);
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function ToolRowItem({
  tool,
  rank,
  metric,
  maxValue,
}: {
  tool: ToolRow;
  rank: number;
  metric: UsageMetric;
  maxValue: number;
}) {
  const value = toolMetricValue(tool, metric);

  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/70 px-3 py-2.5">
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
        {rank}
      </span>
      {getToolCategoryIcon(tool.category, { size: 16 })}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium">{tool.label}</p>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatToolMetric(tool, metric)}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/80">
          <div
            className={cn("h-full rounded-full", getBrandAccentClass(tool.category))}
            style={{ width: `${Math.max(6, (value / Math.max(maxValue, 1)) * 100)}%` }}
          />
        </div>
      </div>
    </li>
  );
}

export function PopularTools({
  tools,
  metric,
}: {
  tools: ToolRow[];
  metric: UsageMetric;
}) {
  const ranked = useMemo(() => {
    return [...tools]
      .sort((a, b) => toolMetricValue(b, metric) - toolMetricValue(a, metric))
      .slice(0, 10);
  }, [tools, metric]);

  if (ranked.length === 0) {
    return null;
  }

  const maxValue = Math.max(...ranked.map((tool) => toolMetricValue(tool, metric)), 1);
  const { left, right } = splitRankedColumns(ranked);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Popular tools</h2>
        {metric === "cost" ? (
          <p className="text-xs text-muted-foreground">
            By token cost
          </p>
        ) : metric === "tokens" ? (
          <p className="text-xs text-muted-foreground">
            By token usage
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">By number of uses</p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-x-4">
        <ol className="flex flex-col gap-2">
          {left.map((tool, index) => (
            <ToolRowItem
              key={tool.category}
              maxValue={maxValue}
              metric={metric}
              rank={index + 1}
              tool={tool}
            />
          ))}
        </ol>
        {right.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {right.map((tool, index) => (
              <ToolRowItem
                key={tool.category}
                maxValue={maxValue}
                metric={metric}
                rank={index + 6}
                tool={tool}
              />
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
