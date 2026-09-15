import { parse as parseCsv } from "csv-parse/sync";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import {
  ATTACHMENT_CSV_PREVIEW_ROWS,
  ATTACHMENT_PREVIEW_CHARS,
  ATTACHMENT_READ_MAX_CHARS,
  isCsvMime,
  isDocxMime,
  isImageMime,
  isPdfMime,
  isTextLikeMime,
} from "#shared/types/attachment";

export type AttachmentContentResult = {
  kind: "text" | "csv" | "pdf" | "docx" | "image" | "unsupported";
  text: string;
  truncated: boolean;
  pageCount?: number;
  rowCount?: number;
  columns?: string[];
  note?: string;
};

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function clip(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return {
    text: `${text.slice(0, maxChars)}\n\n…[truncated]`,
    truncated: true,
  };
}

function rowsToMarkdown(header: string[], rows: string[][]): string {
  const escape = (cell: string) =>
    cell.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const head = `| ${header.map(escape).join(" | ")} |`;
  const sep = `| ${header.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escape).join(" | ")} |`).join("\n");
  return [head, sep, body].filter(Boolean).join("\n");
}

function parseCsvDocument(bytes: Uint8Array): {
  header: string[];
  rows: string[][];
  rowCount: number;
} {
  const records = parseCsv(decodeUtf8(bytes), {
    relax_column_count: true,
    skip_empty_lines: true,
    bom: true,
  }) as string[][];

  if (records.length === 0) {
    return { header: [], rows: [], rowCount: 0 };
  }

  const header = records[0]!.map((cell) => String(cell ?? ""));
  const rows = records.slice(1).map((row) =>
    header.map((_, index) => String(row[index] ?? "")),
  );
  return { header, rows, rowCount: rows.length };
}

async function extractPdfPages(
  bytes: Uint8Array,
): Promise<{ pages: string[]; pageCount: number }> {
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text.map((page) => page ?? "") : [String(text ?? "")];
  return {
    pages,
    pageCount: totalPages || pages.length,
  };
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  return result.value ?? "";
}

export async function previewAttachmentContent(input: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<AttachmentContentResult> {
  const { filename, mimeType, bytes } = input;

  if (isImageMime(mimeType)) {
    return {
      kind: "image",
      text: "",
      truncated: false,
      note:
        "Image stored successfully. Pixel/OCR extraction is not available in v1 — describe what you need from the filename/context, or ask the user.",
    };
  }

  if (isCsvMime(mimeType, filename)) {
    const { header, rows, rowCount } = parseCsvDocument(bytes);
    const previewRows = rows.slice(0, ATTACHMENT_CSV_PREVIEW_ROWS);
    const table = rowsToMarkdown(header.length ? header : ["col"], previewRows);
    const clipped = clip(table, ATTACHMENT_PREVIEW_CHARS);
    return {
      kind: "csv",
      text: clipped.text,
      truncated: clipped.truncated || rows.length > ATTACHMENT_CSV_PREVIEW_ROWS,
      rowCount,
      columns: header,
      note:
        rows.length > ATTACHMENT_CSV_PREVIEW_ROWS
          ? `Showing header + first ${ATTACHMENT_CSV_PREVIEW_ROWS} of ${rowCount} data rows.`
          : undefined,
    };
  }

  if (isPdfMime(mimeType)) {
    const { pages, pageCount } = await extractPdfPages(bytes);
    const excerpt = pages.slice(0, 2).join("\n\n---\n\n");
    const clipped = clip(excerpt, ATTACHMENT_PREVIEW_CHARS);
    return {
      kind: "pdf",
      text: clipped.text,
      truncated: clipped.truncated || pageCount > 2,
      pageCount,
      note:
        pageCount > 2
          ? `Preview is first ${Math.min(2, pageCount)} of ${pageCount} pages.`
          : undefined,
    };
  }

  if (isDocxMime(mimeType)) {
    const full = await extractDocx(bytes);
    const clipped = clip(full, ATTACHMENT_PREVIEW_CHARS);
    return {
      kind: "docx",
      text: clipped.text,
      truncated: clipped.truncated,
    };
  }

  if (isTextLikeMime(mimeType) || mimeType.startsWith("text/")) {
    const clipped = clip(decodeUtf8(bytes), ATTACHMENT_PREVIEW_CHARS);
    return {
      kind: "text",
      text: clipped.text,
      truncated: clipped.truncated,
    };
  }

  return {
    kind: "unsupported",
    text: "",
    truncated: false,
    note: `No text extractor for mime type ${mimeType}`,
  };
}

export async function readAttachmentContent(input: {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  pageStart?: number;
  pageEnd?: number;
  rowStart?: number;
  rowEnd?: number;
  offset?: number;
  limit?: number;
}): Promise<AttachmentContentResult> {
  const { filename, mimeType, bytes } = input;

  if (isImageMime(mimeType)) {
    return {
      kind: "image",
      text: "",
      truncated: false,
      note:
        "Image content cannot be read as text in v1. Use the filename and user description instead.",
    };
  }

  if (isCsvMime(mimeType, filename)) {
    const { header, rows, rowCount } = parseCsvDocument(bytes);
    const start = Math.max(1, input.rowStart ?? 1);
    const end = Math.min(rowCount, input.rowEnd ?? start + 99);
    const slice = rows.slice(start - 1, end);
    const table = rowsToMarkdown(header.length ? header : ["col"], slice);
    const clipped = clip(table, ATTACHMENT_READ_MAX_CHARS);
    return {
      kind: "csv",
      text: clipped.text,
      truncated: clipped.truncated || end < rowCount,
      rowCount,
      columns: header,
      note: `Rows ${start}–${Math.min(end, rowCount)} of ${rowCount} (1-based, header always included).`,
    };
  }

  if (isPdfMime(mimeType)) {
    const { pages, pageCount } = await extractPdfPages(bytes);
    const start = Math.max(1, input.pageStart ?? 1);
    const end = Math.min(pageCount, input.pageEnd ?? start);
    const excerpt = pages.slice(start - 1, end).join("\n\n---\n\n");
    const clipped = clip(excerpt, ATTACHMENT_READ_MAX_CHARS);
    return {
      kind: "pdf",
      text: clipped.text,
      truncated: clipped.truncated,
      pageCount,
      note: `Pages ${start}–${end} of ${pageCount}.`,
    };
  }

  const full = isDocxMime(mimeType)
    ? await extractDocx(bytes)
    : decodeUtf8(bytes);
  const offset = Math.max(0, input.offset ?? 0);
  const limit = Math.min(
    ATTACHMENT_READ_MAX_CHARS,
    Math.max(1, input.limit ?? ATTACHMENT_READ_MAX_CHARS),
  );
  const slice = full.slice(offset, offset + limit);
  const truncated = offset + limit < full.length || offset > 0;
  return {
    kind: isDocxMime(mimeType) ? "docx" : "text",
    text: truncated && offset + limit < full.length
      ? `${slice}\n\n…[truncated]`
      : slice,
    truncated: offset + limit < full.length,
    note: `Chars ${offset}–${offset + slice.length} of ${full.length}.`,
  };
}
