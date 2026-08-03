import { z } from "zod";

/** Colours dither-kit can paint — keep in sync with `DitherColor`. */
export const ARTIFACT_CHART_COLOURS = [
  "ink",
  "grey",
  "green",
  "blue",
  "purple",
  "pink",
  "orange",
  "red",
] as const;

export type ArtifactChartColour = typeof ARTIFACT_CHART_COLOURS[number];

export const ARTIFACT_CHART_TYPES = ["area", "bar", "pie"] as const;

export type ArtifactChartType = typeof ARTIFACT_CHART_TYPES[number];

const chartColourSchema = z.enum(ARTIFACT_CHART_COLOURS);

const chartSeriesSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(80).optional(),
  color: chartColourSchema.optional(),
});

const chartRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

/**
 * Declarative chart baked into an artifact body as a ```chart fence.
 * Validated before it ever reaches dither-kit.
 */
export const artifactChartSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("area"),
    title: z.string().trim().min(1).max(120).optional(),
    xKey: z.string().trim().min(1).max(64),
    series: z.array(chartSeriesSchema).min(1).max(6),
    data: z.array(chartRowSchema).min(1).max(100),
  }),
  z.object({
    type: z.literal("bar"),
    title: z.string().trim().min(1).max(120).optional(),
    xKey: z.string().trim().min(1).max(64),
    series: z.array(chartSeriesSchema).min(1).max(6),
    data: z.array(chartRowSchema).min(1).max(100),
  }),
  z.object({
    type: z.literal("pie"),
    title: z.string().trim().min(1).max(120).optional(),
    nameKey: z.string().trim().min(1).max(64),
    valueKey: z.string().trim().min(1).max(64),
    /** Optional per-slice colour keyed by the name field's value. */
    colors: z.record(z.string(), chartColourSchema).optional(),
    data: z.array(chartRowSchema).min(1).max(24),
  }),
]);

export type ArtifactChartSpec = z.infer<typeof artifactChartSpecSchema>;

export type ArtifactBlock =
  | { kind: "markdown"; content: string }
  | { kind: "chart"; spec: ArtifactChartSpec }
  | { kind: "chart-error"; message: string; raw: string };

/** Opening fence must be on its own line so nested markdown stays intact. */
const CHART_FENCE_PATTERN = /^```chart[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm;

function chartFenceRegex(): RegExp {
  // Fresh instance each call — a shared /g regex would leak lastIndex across parses.
  return new RegExp(CHART_FENCE_PATTERN.source, CHART_FENCE_PATTERN.flags);
}

/**
 * Split an artifact body into prose segments and chart fences. Invalid JSON
 * becomes a `chart-error` block rather than breaking the whole document.
 */
export function parseArtifactBlocks(markdown: string): ArtifactBlock[] {
  const blocks: ArtifactBlock[] = [];
  let cursor = 0;

  for (const match of markdown.matchAll(chartFenceRegex())) {
    const index = match.index ?? 0;
    if (index > cursor) {
      const prose = markdown.slice(cursor, index);
      if (prose.trim()) {
        blocks.push({ kind: "markdown", content: prose });
      }
    }

    const raw = match[1]?.trim() ?? "";
    try {
      const parsed: unknown = JSON.parse(raw);
      const spec = artifactChartSpecSchema.parse(parsed);
      blocks.push({ kind: "chart", spec });
    }
    catch (error) {
      blocks.push({
        kind: "chart-error",
        raw,
        message: error instanceof Error ? error.message : "Invalid chart block",
      });
    }

    cursor = index + match[0].length;
  }

  if (cursor < markdown.length) {
    const prose = markdown.slice(cursor);
    if (prose.trim()) {
      blocks.push({ kind: "markdown", content: prose });
    }
  }

  if (blocks.length === 0 && markdown.trim()) {
    blocks.push({ kind: "markdown", content: markdown });
  }

  return blocks;
}

/** Inline-card preview: swap chart fences for a short label so Streamdown
 * doesn't dump the JSON as a code block. */
export function stripArtifactChartsForPreview(markdown: string): string {
  return markdown.replace(chartFenceRegex(), (_full, raw: string) => {
    try {
      const parsed: unknown = JSON.parse(String(raw).trim());
      const spec = artifactChartSpecSchema.parse(parsed);
      const title = "title" in spec && spec.title ? spec.title : `${spec.type} chart`;
      return `\n\n*(${title})*\n\n`;
    }
    catch {
      return "\n\n*(chart)*\n\n";
    }
  });
}

export type LeadingArtifactVisual =
  | { kind: "chart"; spec: ArtifactChartSpec }
  | { kind: "image"; src: string; alt?: string };

const LEADING_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/**
 * First chart fence or markdown image near the top of the body — used for Docs
 * icon thumbnails under the cover title. Ignored if too much prose precedes it.
 * Pass body that has already had a duplicate cover `#` heading stripped.
 */
export function extractLeadingArtifactVisual(
  contentMarkdown: string,
  maxProseBefore = 480,
): LeadingArtifactVisual | undefined {
  type Candidate = { index: number; visual: LeadingArtifactVisual };
  let best: Candidate | undefined;

  for (const match of contentMarkdown.matchAll(chartFenceRegex())) {
    const index = match.index ?? 0;
    try {
      const parsed: unknown = JSON.parse(String(match[1] ?? "").trim());
      const spec = artifactChartSpecSchema.parse(parsed);
      if (!best || index < best.index) {
        best = { index, visual: { kind: "chart", spec } };
      }
    }
    catch {
      // skip invalid fences
    }
  }

  for (const match of contentMarkdown.matchAll(
    new RegExp(LEADING_IMAGE_PATTERN.source, "g"),
  )) {
    const index = match.index ?? 0;
    const src = match[2]?.trim();
    if (!src) continue;
    if (!best || index < best.index) {
      best = {
        index,
        visual: {
          kind: "image",
          src,
          alt: match[1]?.trim() || undefined,
        },
      };
    }
  }

  if (!best) {
    return undefined;
  }

  const proseBefore = contentMarkdown
    .slice(0, best.index)
    .replace(/^#{1,6}\s+.+$/gm, "")
    .replace(/[*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (proseBefore.length > maxProseBefore) {
    return undefined;
  }

  return best.visual;
}
