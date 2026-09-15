import { defineTool } from "eve/tools";
import { z } from "zod";
import { readAttachmentRemote } from "../lib/attachment-internal.js";

/**
 * Bounded read of an uploaded attachment (page / row / char ranges).
 */
export default defineTool({
  description:
    "Read a bounded slice of a user-uploaded chat attachment. Prefer preview_attachment first. For PDFs use pageStart/pageEnd; for CSVs use rowStart/rowEnd (1-based data rows, header always included); for text/DOCX use offset/limit characters. Output is capped to avoid context bloat.",
  inputSchema: z.object({
    attachmentId: z
      .string()
      .min(1)
      .describe("Attachment id from an [[attachment:id|filename]] marker."),
    pageStart: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("PDF: first page to include (1-based)."),
    pageEnd: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("PDF: last page to include (1-based, inclusive)."),
    rowStart: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("CSV: first data row (1-based, excludes header)."),
    rowEnd: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("CSV: last data row (1-based, inclusive)."),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Text/DOCX: character offset to start from."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20_000)
      .optional()
      .describe("Text/DOCX: max characters to return (capped server-side)."),
  }),
  async execute(input, ctx) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      throw new Error("Cannot read attachments without an authenticated user");
    }

    return readAttachmentRemote({
      userId,
      attachmentId: input.attachmentId,
      pageStart: input.pageStart,
      pageEnd: input.pageEnd,
      rowStart: input.rowStart,
      rowEnd: input.rowEnd,
      offset: input.offset,
      limit: input.limit,
    });
  },
  toModelOutput(output) {
    const { attachment, content } = output;
    const meta = [
      `file=${attachment.filename}`,
      content.note ?? null,
      content.truncated ? "truncated=true — request another range if needed" : null,
    ]
      .filter(Boolean)
      .join("; ");

    const body = content.text.trim()
      ? `\n${content.text}`
      : content.note
        ? `\n${content.note}`
        : "\n(no extractable text)";

    return {
      type: "text",
      value: `Attachment read (${meta}).${body}`,
    };
  },
});
