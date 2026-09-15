import { appOrigin, internalHeaders } from "./internal-api.js";

export type AttachmentToolContent = {
  kind: string;
  text: string;
  truncated: boolean;
  pageCount?: number;
  rowCount?: number;
  columns?: string[];
  note?: string;
};

export type AttachmentToolResult = {
  attachment: {
    id: string;
    threadId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    pageCount?: number | null;
    rowCount?: number | null;
  };
  content: AttachmentToolContent;
};

async function callAttachmentsInternal(
  mode: "preview" | "read",
  body: Record<string, unknown>,
): Promise<AttachmentToolResult> {
  const response = await fetch(
    `${appOrigin()}/api/internal/attachments?mode=${mode}`,
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let detail = response.statusText;
    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json() as { message?: unknown };
        if (typeof payload.message === "string" && payload.message.trim()) {
          detail = payload.message.trim();
        }
      }
      catch {
        // keep statusText
      }
    }
    throw new Error(`Attachment ${mode} failed: ${response.status} ${detail}`);
  }

  return await response.json() as AttachmentToolResult;
}

export function previewAttachmentRemote(input: {
  userId: string;
  attachmentId: string;
}): Promise<AttachmentToolResult> {
  return callAttachmentsInternal("preview", input);
}

export function readAttachmentRemote(input: {
  userId: string;
  attachmentId: string;
  pageStart?: number;
  pageEnd?: number;
  rowStart?: number;
  rowEnd?: number;
  offset?: number;
  limit?: number;
}): Promise<AttachmentToolResult> {
  return callAttachmentsInternal("read", input);
}
