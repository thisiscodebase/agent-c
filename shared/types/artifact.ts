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
  metadata: Record<string, unknown>;
  threadId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Artifact extends ArtifactSummary {
  contentMarkdown: string;
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
 * Leading slice of an artifact body, for the inline chat card and for the tool
 * result the model sees. Cuts on a line boundary so markdown stays parseable.
 */
export function buildArtifactPreview(contentMarkdown: string, maxLines = 40): string {
  const lines = contentMarkdown.trimEnd().split("\n");
  if (lines.length <= maxLines) {
    return contentMarkdown.trim();
  }

  return `${lines.slice(0, maxLines).join("\n").trimEnd()}\n\n…`;
}
