/**
 * Chat file attachments stored in private Supabase Storage.
 * Prompt text carries lightweight markers; the agent reads via tools.
 */

export const ATTACHMENT_MARKER_RE =
  /\[\[attachment:([^|\]]+)\|((?:\\.|[^\]\\])*)\]\]/g;

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TURN = 5;

/** Char budget returned to the model from a single read/preview. */
export const ATTACHMENT_PREVIEW_CHARS = 2_000;
export const ATTACHMENT_READ_MAX_CHARS = 16_000;
export const ATTACHMENT_CSV_PREVIEW_ROWS = 20;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedAttachmentMime =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

const EXT_TO_MIME: Record<string, AllowedAttachmentMime> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export type ChatAttachmentRecord = {
  id: string;
  threadId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number | null;
  rowCount?: number | null;
  /** Optional short-lived signed URL for UI preview (images). */
  url?: string;
  createdAt: number;
};

export type UploadedAttachment = {
  id: string;
  name: string;
  type: string;
  url: string;
  sizeBytes: number;
  pageCount?: number | null;
  rowCount?: number | null;
  isUploading?: boolean;
};

export function escapeAttachmentMarkerName(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/]/g, "\\]");
}

export function unescapeAttachmentMarkerName(name: string): string {
  return name.replace(/\\([\\|\\\]])/g, "$1");
}

export function formatAttachmentMarker(id: string, filename: string): string {
  return `[[attachment:${id}|${escapeAttachmentMarkerName(filename)}]]`;
}

export function appendAttachmentMarkers(
  text: string,
  attachments: readonly { id: string; name: string }[],
): string {
  if (attachments.length === 0) {
    return text;
  }
  const markers = attachments
    .map((file) => formatAttachmentMarker(file.id, file.name))
    .join("\n");
  const trimmed = text.trimEnd();
  return trimmed ? `${trimmed}\n\n${markers}` : markers;
}

export function resolveAttachmentMime(
  mimeType: string | undefined,
  filename: string,
): AllowedAttachmentMime | null {
  const normalized = (mimeType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(normalized)
  ) {
    return normalized as AllowedAttachmentMime;
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) {
    return null;
  }
  return EXT_TO_MIME[ext] ?? null;
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isCsvMime(mimeType: string, filename?: string): boolean {
  if (mimeType === "text/csv" || mimeType === "application/csv") {
    return true;
  }
  return (filename ?? "").toLowerCase().endsWith(".csv");
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export function isDocxMime(mimeType: string): boolean {
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || mimeType === "application/msword"
  );
}

export function isTextLikeMime(mimeType: string): boolean {
  return (
    mimeType === "text/plain"
    || mimeType === "text/markdown"
    || mimeType === "application/json"
  );
}
