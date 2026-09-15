import {
  appendAttachmentMarkers,
  MAX_ATTACHMENTS_PER_TURN,
  type UploadedAttachment,
} from "#shared/types/attachment";

export async function uploadThreadAttachments(
  threadId: string,
  files: readonly File[],
): Promise<UploadedAttachment[]> {
  if (files.length === 0) {
    return [];
  }

  if (files.length > MAX_ATTACHMENTS_PER_TURN) {
    throw new Error(`At most ${MAX_ATTACHMENTS_PER_TURN} files per message`);
  }

  const form = new FormData();
  for (const file of files) {
    form.append("files", file, file.name);
  }

  const response = await fetch(`/api/threads/${threadId}/attachments`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = "Upload failed";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) detail = body.message;
    }
    catch {
      // keep default
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as {
    attachments: UploadedAttachment[];
  };
  return payload.attachments;
}

export function buildMessageWithAttachments(
  text: string,
  attachments: readonly UploadedAttachment[],
): string {
  return appendAttachmentMarkers(
    text,
    attachments.map((file) => ({ id: file.id, name: file.name })),
  );
}
