"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import type { UsageMetric } from "#shared/types/usage-metric";
import { ADMIN_USAGE_METRICS } from "#shared/types/usage-metric";
import type { UsageToolNameStat } from "#shared/types/usage-stats";
import { AdminThreadList } from "~/components/admin/admin-thread-list";
import { UsageMetricSwitcher } from "~/components/profile/usage-metric-switcher";
import { Button } from "~/components/ui/button";
import { useAdminAccess, useAdminToolCategory } from "~/hooks/use-admin";
import { formatCostUsd, formatTokenCount } from "~/lib/format-usage";
import { getToolCategoryIcon } from "~/lib/tool-icons";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
    </div>
  );
}

function toolNameMetric(tool: UsageToolNameStat, metric: UsageMetric): string {
  switch (metric) {
    case "cost":
      return formatCostUsd(tool.costUsd);
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

function ToolNameTable({
  tools,
  metric,
}: {
  tools: UsageToolNameStat[];
  metric: UsageMetric;
}) {
  if (tools.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tool calls in this category yet.</p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Tools in this category</h2>
        <p className="text-xs text-muted-foreground">
          Individual tool names · attributed tokens/cost (equal-split per step)
        </p>
      </div>
      <ol className="flex flex-col gap-1">
        {tools.map((tool, index) => (
          <li
            key={tool.toolName}
            className="flex items-center gap-3 rounded-xl bg-muted/70 px-3 py-2.5"
          >
            <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tool.label}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {tool.toolName}
              </p>
            </div>
            <div className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              <p>{toolNameMetric(tool, metric)}</p>
              {metric !== "agents" ? (
                <p className="text-xs">{tool.calls} calls</p>
              ) : (
                <p className="text-xs">{formatTokenCount(tool.tokens)}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function AdminToolCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = use(params);
  const category = decodeURIComponent(rawCategory);
  const access = useAdminAccess();
  const { data, isLoading, error } = useAdminToolCategory(
    category,
    access.data?.allowed === true,
  );
  const [metric, setMetric] = useState<UsageMetric>("cost");

  if (access.isLoading || (access.data?.allowed && isLoading)) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading tool…</p>
      </div>
    );
  }

  if (access.data && !access.data.allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
        <p className="text-sm text-muted-foreground">Admin access required.</p>
        <Button nativeButton={false} render={<Link href="/leaderboard" />} variant="outline">
          Back to leaderboard
        </Button>
      </div>
    );
  }

  if (error || !data?.tool) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load tool category"}
        </p>
      </div>
    );
  }

  const tool = data.tool;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8 md:px-10">
        <div>
          <Button
            className="mb-4 -ml-2 text-muted-foreground"
            nativeButton={false}
            render={<Link href="/admin" />}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon />
            Admin dashboard
          </Button>
          <header className="flex min-w-0 items-center gap-3">
            {getToolCategoryIcon(tool.category, { size: 28 })}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {tool.label}
              </h1>
              <p className="text-sm text-muted-foreground">
                Tool usage breakdown · company-wide
              </p>
            </div>
          </header>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Metric label="Cost" value={formatCostUsd(tool.costUsd)} />
          <Metric label="Tokens" value={formatTokenCount(tool.tokens)} />
          <Metric label="Calls" value={String(tool.calls)} />
          <Metric
            label="Tokens / call"
            value={formatTokenCount(Math.round(tool.tokensPerCall))}
          />
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Attributed cost and tokens are approximate: each LLM step’s usage is
          split equally across tools requested on that step. Tools that run late
          in a long turn inherit a larger context and can look more expensive
          than they are intrinsically.
          {tool.discovery ? (
            <>
              {" "}
              Discovery (`connection_search`) for this connector:{" "}
              <span className="font-medium text-foreground">
                {tool.discovery.calls} calls · {formatTokenCount(tool.discovery.tokens)} ·{" "}
                {formatCostUsd(tool.discovery.costUsd)}
              </span>
              .
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Sort tables by</p>
          <UsageMetricSwitcher
            options={ADMIN_USAGE_METRICS}
            value={metric}
            onChange={setMetric}
          />
        </div>

        <ToolNameTable metric={metric} tools={tool.tools} />

        <AdminThreadList
          categoryAttributed
          metric={metric}
          threads={tool.threads}
        />
      </div>
    </div>
  );
}
