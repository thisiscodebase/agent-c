"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Grid,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  type AreaVariant,
  type ChartConfig,
} from "~/components/dither-kit";
import type { ArtifactChartSpec } from "#shared/types/artifact-chart";
import { cn } from "~/lib/utils";

/**
 * Artifact charts sit on coloured paper: near-black ink, textures for series,
 * stacked when several series share one plot. No entrance wipe or sparkle dots.
 */
const INK = "ink" as const;

/** Prefer soft fade first; denser textures when several series need telling apart. */
const PATTERN_CYCLE: AreaVariant[] = ["gradient", "hatched", "dotted", "solid"];

const PATTERN_LABEL: Record<AreaVariant, string> = {
  gradient: "Fade",
  hatched: "Hatched",
  dotted: "Dotted",
  solid: "Solid",
};

function patternAt(index: number): AreaVariant {
  return PATTERN_CYCLE[index % PATTERN_CYCLE.length] ?? "gradient";
}

function monoConfig(
  entries: { key: string; label?: string }[],
): ChartConfig {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.key,
      { label: entry.label ?? entry.key, color: INK },
    ]),
  );
}

function pieNames(
  data: Record<string, string | number | boolean | null>[],
  nameKey: string,
): string[] {
  return [...new Set(
    data
      .map((row) => row[nameKey])
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  )];
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }
  return String(value);
}

function PatternSwatch({ pattern }: { pattern: AreaVariant }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2.5 shrink-0 rounded-[1px] border border-foreground/40",
        pattern === "solid" && "bg-foreground/80",
        pattern === "gradient" && "bg-gradient-to-b from-foreground/25 to-foreground/80",
        pattern === "hatched"
          && "bg-[repeating-linear-gradient(-45deg,transparent_0_1px,var(--foreground)_1px_2px)] opacity-80",
        pattern === "dotted"
          && "bg-[radial-gradient(circle_at_center,var(--foreground)_0.6px,transparent_0.7px)] bg-size-[3px_3px] opacity-80",
      )}
      title={PATTERN_LABEL[pattern]}
    />
  );
}

function PatternLegend({
  items,
}: {
  items: { key: string; label: string; pattern: AreaVariant }[];
}) {
  if (items.length <= 1) {
    return null;
  }

  return (
    <ul className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap justify-end gap-3 px-1">
      {items.map((item) => (
        <li
          className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
          key={item.key}
        >
          <PatternSwatch pattern={item.pattern} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Still, stacked, no sparkle — the print-document chart defaults. */
const PRINT_CHART = {
  animate: false,
  showStars: false,
  bloom: "off" as const,
} as const;

const FULL_MARGINS = { top: 8, right: 8, bottom: 22, left: 36 } as const;
const FULL_MARGINS_STACKED = { top: 22, right: 8, bottom: 22, left: 36 } as const;
const FULL_MARGINS_BAR = { top: 8, right: 8, bottom: 22, left: 28 } as const;
const FULL_MARGINS_BAR_STACKED = { top: 22, right: 8, bottom: 22, left: 28 } as const;
const COMPACT_MARGINS = { top: 2, right: 2, bottom: 2, left: 2 } as const;

export function ArtifactChart({ spec }: { spec: ArtifactChartSpec }) {
  return (
    <figure className="not-prose my-6 flex flex-col gap-2">
      {spec.title ? (
        <figcaption className="text-sm font-medium text-foreground">{spec.title}</figcaption>
      ) : null}

      <div className="relative h-52 w-full">
        <ArtifactChartPlot spec={spec} />
      </div>
    </figure>
  );
}

/** Bare dither plot — same ink/textures as the document, sized by its parent. */
export function ArtifactChartPlot({
  spec,
  compact = false,
}: {
  spec: ArtifactChartSpec;
  /** Hide chrome (legend, axes, tooltip) for cover cards and Docs tiles. */
  compact?: boolean;
}) {
  switch (spec.type) {
    case "area": {
      const config = monoConfig(spec.series);
      const legend = spec.series.map((entry, index) => ({
        key: entry.key,
        label: entry.label ?? entry.key,
        pattern: patternAt(index),
      }));
      const stacked = spec.series.length > 1;

      return (
        <>
          {compact ? null : <PatternLegend items={legend} />}
          <AreaChart
            {...PRINT_CHART}
            config={config}
            data={spec.data}
            margins={
              compact
                ? COMPACT_MARGINS
                : stacked
                  ? FULL_MARGINS_STACKED
                  : FULL_MARGINS
            }
            stackType={stacked ? "stacked" : "default"}
          >
            {compact ? null : <Grid horizontal />}
            {compact ? null : (
              <XAxis dataKey={spec.xKey} maxTicks={Math.min(8, spec.data.length)} />
            )}
            {compact ? null : <YAxis tickFormatter={formatTick} />}
            {spec.series.map((entry, index) => (
              <Area
                dataKey={entry.key}
                key={entry.key}
                variant={patternAt(index)}
              />
            ))}
            {compact ? null : <Tooltip labelKey={spec.xKey} />}
          </AreaChart>
        </>
      );
    }
    case "bar": {
      const config = monoConfig(spec.series);
      const legend = spec.series.map((entry, index) => ({
        key: entry.key,
        label: entry.label ?? entry.key,
        pattern: patternAt(index),
      }));
      const stacked = spec.series.length > 1;

      return (
        <>
          {compact ? null : <PatternLegend items={legend} />}
          <BarChart
            {...PRINT_CHART}
            config={config}
            data={spec.data}
            margins={
              compact
                ? COMPACT_MARGINS
                : stacked
                  ? FULL_MARGINS_BAR_STACKED
                  : FULL_MARGINS_BAR
            }
            stackType={stacked ? "stacked" : "default"}
          >
            {compact ? null : <Grid horizontal />}
            {compact ? null : (
              <XAxis dataKey={spec.xKey} maxTicks={Math.min(8, spec.data.length)} />
            )}
            {compact ? null : <YAxis tickFormatter={formatTick} />}
            {spec.series.map((entry, index) => (
              <Bar
                dataKey={entry.key}
                key={entry.key}
                variant={patternAt(index)}
              />
            ))}
            {compact ? null : <Tooltip labelKey={spec.xKey} />}
          </BarChart>
        </>
      );
    }
    case "pie": {
      const names = pieNames(spec.data, spec.nameKey);
      const config = monoConfig(names.map((name) => ({ key: name, label: name })));
      const sliceVariants = Object.fromEntries(
        names.map((name, index) => [name, patternAt(index)]),
      ) as Record<string, AreaVariant>;
      const legend = names.map((name, index) => ({
        key: name,
        label: name,
        pattern: patternAt(index),
      }));

      return (
        <>
          {compact ? null : <PatternLegend items={legend} />}
          <PieChart
            animate={false}
            bloom="off"
            config={config}
            data={spec.data}
            dataKey={spec.valueKey}
            innerRadius={compact ? 0.5 : 0.55}
            nameKey={spec.nameKey}
          >
            <Pie variants={sliceVariants} />
            {compact ? null : <Tooltip />}
          </PieChart>
        </>
      );
    }
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}
