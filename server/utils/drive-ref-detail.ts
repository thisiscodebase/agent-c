/**
 * Drive file detail for the composer `@` mention panel.
 * Metadata + text preview when the file can be exported/downloaded as text.
 */

import type { ComposerRefItem } from "#shared/composer-refs";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_META_FIELDS =
  "id,name,mimeType,modifiedTime,createdTime,webViewLink,owners(displayName,emailAddress)";
const CONTENT_MAX_CHARS = 80_000;

export type DriveRefDetail = ComposerRefItem & {
  bodyText?: string;
  bodyNote?: string;
};

type DriveFileMeta = {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
};

async function driveFetchJson<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) detail = body.error.message;
    } catch {
      // ignore
    }
    throw new Error(`Drive API error: ${detail}`);
  }
  return res.json() as Promise<T>;
}

function exportMimeType(mimeType: string): string | null {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
    case "application/vnd.google-apps.presentation":
      return "text/plain";
    case "application/vnd.google-apps.spreadsheet":
      return "text/csv";
    default:
      return null;
  }
}

function isLikelyTextMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/javascript" ||
    mimeType.endsWith("+json") ||
    mimeType.endsWith("+xml")
  );
}

function mapMeta(file: DriveFileMeta): ComposerRefItem {
  const owner = file.owners?.[0];
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedAt: file.modifiedTime,
    createdAt: file.createdTime,
    author:
      owner?.displayName?.trim() || owner?.emailAddress?.trim() || undefined,
    url:
      file.webViewLink ??
      `https://drive.google.com/file/d/${file.id}/view`,
  };
}

export async function getDriveRefDetail(
  token: string,
  fileId: string,
): Promise<DriveRefDetail> {
  const params = new URLSearchParams({
    fields: DRIVE_META_FIELDS,
    supportsAllDrives: "true",
  });
  const meta = await driveFetchJson<DriveFileMeta>(
    token,
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params}`,
  );
  const item = mapMeta(meta);
  const mime = meta.mimeType ?? "";

  const exportType = exportMimeType(mime);
  let contentUrl: string | null = null;

  if (exportType) {
    const exportParams = new URLSearchParams({ mimeType: exportType });
    contentUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/export?${exportParams}`;
  } else if (isLikelyTextMime(mime)) {
    const mediaParams = new URLSearchParams({
      alt: "media",
      supportsAllDrives: "true",
    });
    contentUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${mediaParams}`;
  }

  if (!contentUrl) {
    return {
      ...item,
      bodyNote:
        "This file type can’t be previewed here. Open it in Google Drive instead.",
    };
  }

  const res = await fetch(contentUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return {
      ...item,
      bodyNote: "Couldn’t load a text preview for this file.",
    };
  }

  const text = await res.text();
  const truncated =
    text.length > CONTENT_MAX_CHARS
      ? `${text.slice(0, CONTENT_MAX_CHARS)}\n\n…truncated`
      : text;

  return { ...item, bodyText: truncated };
}
