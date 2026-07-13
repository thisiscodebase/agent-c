"use client";

import type { UsageMetric } from "#shared/types/usage-metric";
import { usageMetricLabel } from "#shared/types/usage-metric";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

export function UsageMetricSwitcher({
  value,
  options,
  onChange,
}: {
  value: UsageMetric;
  options: readonly UsageMetric[];
  onChange: (metric: UsageMetric) => void;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (options.includes(next as UsageMetric)) {
          onChange(next as UsageMetric);
        }
      }}
    >
      <TabsList className="bg-muted-foreground/15 dark:bg-muted-foreground/25">
        {options.map((metric) => (
          <TabsTrigger
            key={metric}
            className="data-active:bg-white data-active:text-foreground data-active:shadow-sm dark:data-active:bg-background dark:data-active:text-foreground"
            value={metric}
          >
            {usageMetricLabel(metric)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
