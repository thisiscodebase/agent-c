"use client";

import { useMemo } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import { ModelProviderLogo, modelBrandAccentClass } from "~/components/profile/model-provider-logo";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";
import { splitRankedColumns } from "~/lib/ranked-columns";
import { cn } from "~/lib/utils";

type ModelRow = {
  modelId: string;
  label: string;
  tokens: number;
  agents: number;
  costUsd?: number;
};

function modelMetricValue(model: ModelRow, metric: UsageMetric): number {
  switch (metric) {
    case "cost":
      return model.costUsd ?? 0;
    case "tokens":
      return model.tokens;
    case "agents":
      return model.agents;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function formatModelMetric(model: ModelRow, metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return formatCostUsd(model.costUsd ?? 0);
    case "tokens":
      return formatTokenCount(model.tokens);
    case "agents":
      return String(model.agents);
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function ModelRowItem({
  model,
  rank,
  metric,
  maxValue,
}: {
  model: ModelRow;
  rank: number;
  metric: UsageMetric;
  maxValue: number;
}) {
  const value = modelMetricValue(model, metric);

  return (
    <li className="flex items-center gap-3 rounded-xl bg-muted/70 px-3 py-2.5">
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
        {rank}
      </span>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-background/80">
        <ModelProviderLogo
          className="size-4"
          label={model.label}
          modelId={model.modelId}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium">{model.label}</p>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {formatModelMetric(model, metric)}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/80">
          <div
            className={cn("h-full rounded-full", modelBrandAccentClass(model.modelId))}
            style={{ width: `${Math.max(6, (value / Math.max(maxValue, 1)) * 100)}%` }}
          />
        </div>
      </div>
    </li>
  );
}

export function ModelsLeaderboard({
  models,
  metric,
}: {
  models: ModelRow[];
  metric: UsageMetric;
}) {
  const ranked = useMemo(() => {
    return [...models]
      .sort((a, b) => modelMetricValue(b, metric) - modelMetricValue(a, metric))
      .slice(0, 10);
  }, [models, metric]);

  if (ranked.length === 0) {
    return null;
  }

  const maxValue = Math.max(...ranked.map((model) => modelMetricValue(model, metric)), 1);
  const { left, right } = splitRankedColumns(ranked);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">Models</h2>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-x-4">
        <ol className="flex flex-col gap-2">
          {left.map((model, index) => (
            <ModelRowItem
              key={model.modelId}
              maxValue={maxValue}
              metric={metric}
              model={model}
              rank={index + 1}
            />
          ))}
        </ol>
        {right.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {right.map((model, index) => (
              <ModelRowItem
                key={model.modelId}
                maxValue={maxValue}
                metric={metric}
                model={model}
                rank={index + 6}
              />
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
