import { defineTool } from "eve/tools";
import { z } from "zod";
import { previewAttachmentRemote } from "../lib/attachment-internal.js";

/**
 * Firecrawl-style progressive access: metadata + short excerpt before a full read.
 */
export default defineTool({
  description:
    "Preview a user-uploaded chat attachment by id (from [[attachment:id|name]] markers). Returns metadata and a short excerpt (PDF: first pages; CSV: header + first rows; text/DOCX: opening chars). Call this before read_attachment for large files.",
  inputSchema: z.object({
    attachmentId: z
      .string()
      .min(1)
      .describe("Attachment id from an [[attachment:id|filename]] marker in the user message."),
  }),
  async execute({ attachmentId }, ctx) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      throw new Error("Cannot preview attachments without an authenticated user");
    }

    return previewAttachmentRemote({ userId, attachmentId });
  },
  toModelOutput(output) {
    const { attachment, content } = output;
    const meta = [
      `file=${attachment.filename}`,
      `mime=${attachment.mimeType}`,
      `size=${attachment.sizeBytes}`,
      attachment.pageCount != null ? `pages=${attachment.pageCount}` : null,
      attachment.rowCount != null ? `rows=${attachment.rowCount}` : null,
      content.columns?.length ? `columns=${content.columns.join(",")}` : null,
      content.note ?? null,
      content.truncated ? "truncated=true" : null,
    ]
      .filter(Boolean)
      .join("; ");

    const body = content.text.trim()
      ? `\n${content.text}`
      : content.note
        ? `\n${content.note}`
        : "";

    return {
      type: "text",
      value: `Attachment preview (${meta}).${body}`,
    };
  },
});
