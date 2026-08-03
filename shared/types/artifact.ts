import {
  stripArtifactChartsForPreview,
  type LeadingArtifactVisual,
} from "#shared/types/artifact-chart";

export const ARTIFACT_TYPES = [
  "case_study",
  "report",
  "summary",
  "note",
] as const;

export type ArtifactType = typeof ARTIFACT_TYPES[number];

export const ARTIFACT_STATUSES = ["draft", "review", "published"] as const;

export type ArtifactStatus = typeof ARTIFACT_STATUSES[number];

/** Paper stocks an artifact can be printed on. */
export const ARTIFACT_COLOURS = ["white", "peach", "green", "lilac"] as const;

export type ArtifactColour = typeof ARTIFACT_COLOURS[number];

export interface ArtifactSummary {
  id: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  colour: ArtifactColour;
  /** UTF-8 byte length of the body, for file-browser listings. */
  size: number;
  /** First near-top chart or image, for Docs icon thumbnails. */
  leadingVisual?: LeadingArtifactVisual;
  metadata: Record<string, unknown>;
  threadId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Artifact extends ArtifactSummary {
  contentMarkdown: string;
  /** Display name of the user who generated the document. */
  authorName: string;
}

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  case_study: "Case study",
  report: "Report",
  summary: "Summary",
  note: "Note",
};

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
};

/** Short sharing copy for the visibility menu. */
export const ARTIFACT_STATUS_HINTS: Record<ArtifactStatus, string> = {
  draft: "Only you can open this",
  review: "Shared for feedback",
  published: "Ready to share",
};

/**
 * Colour is decorative, so nobody should have to choose one. Deriving it from
 * the id keeps a document the same colour for its whole life while spreading a
 * library across the four stocks.
 */
export function artifactColourForId(id: string): ArtifactColour {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 977;
  }

  return ARTIFACT_COLOURS[hash % ARTIFACT_COLOURS.length];
}

export function truncateArtifactTitle(text: string, maxLength = 80): string {
  const line = text.trim().split("\n")[0]?.trim() || "Untitled artifact";
  if (line.length <= maxLength) {
    return line;
  }

  return `${line.slice(0, maxLength - 1)}…`;
}

/**
 * Drop a leading `# Heading` when it duplicates the cover title the UI already
 * shows — keeps old artifacts and chat previews from repeating the masthead.
 */
export function stripLeadingTitleHeading(contentMarkdown: string, title: string): string {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return contentMarkdown;
  }

  const match = contentMarkdown.match(/^\s*#\s+(.+?)(?:\n|$)/);
  if (!match) {
    return contentMarkdown;
  }

  const heading = match[1]?.trim() ?? "";
  const normalize = (value: string) => value.replace(/\s+/g, " ").toLowerCase();
  if (
    normalize(heading) !== normalize(trimmedTitle)
    && !normalize(trimmedTitle).startsWith(normalize(heading))
    && !normalize(heading).startsWith(normalize(trimmedTitle))
  ) {
    return contentMarkdown;
  }

  return contentMarkdown.slice(match[0].length).replace(/^\n+/, "");
}

/** First prose paragraph for cover cards — skips headings, charts, and images. */
export function extractArtifactSummaryLine(
  contentMarkdown: string,
  title = "",
  maxLength = 160,
): string | undefined {
  const body = stripLeadingTitleHeading(contentMarkdown, title);
  const withoutCharts = stripArtifactChartsForPreview(body)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/^#{1,6}\s+.+$/gm, "")
    .replace(/^\*(.+)\*$/gm, "")
    .trim();

  const paragraph = withoutCharts
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .find((block) => block.length > 0);

  if (!paragraph) {
    return undefined;
  }

  if (paragraph.length <= maxLength) {
    return paragraph;
  }

  return `${paragraph.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Leading slice of an artifact body, for the inline chat card and for the tool
 * result the model sees. Chart fences become a short label so the preview stays
 * readable, then we cut on a line boundary so leftover markdown stays parseable.
 */
export function buildArtifactPreview(contentMarkdown: string, maxLines = 40): string {
  const withoutCharts = stripArtifactChartsForPreview(contentMarkdown);
  const lines = withoutCharts.trimEnd().split("\n");
  if (lines.length <= maxLines) {
    return withoutCharts.trim();
  }

  return `${lines.slice(0, maxLines).join("\n").trimEnd()}\n\n…`;
}
