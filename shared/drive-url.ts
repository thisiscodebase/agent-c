/**
 * Parse Google Drive / Docs / Sheets / Slides URLs for composer paste-to-chip.
 */

export type ParsedDriveUrl = {
  fileId: string;
  /** Best-effort canonical view URL. */
  url: string;
};

const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "sheets.google.com",
  "slides.google.com",
]);

/** Google file ids are URL-safe base64-ish; Shared Drive ids often start with 0A. */
const FILE_ID_RE = /^[\w-]{10,}$/;

function stripClipboardNoise(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

export function driveFallbackName(fileId: string): string {
  const short =
    fileId.length > 10 ? `${fileId.slice(0, 6)}…${fileId.slice(-4)}` : fileId;
  return `Drive ${short}`;
}

export function isSoleDriveUrl(text: string): boolean {
  const cleaned = stripClipboardNoise(text);
  if (!cleaned || /\s/.test(cleaned)) return false;
  return parseDriveUrl(cleaned) !== null;
}

export function parseDriveUrl(raw: string): ParsedDriveUrl | null {
  let url: URL;
  try {
    url = new URL(stripClipboardNoise(raw));
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!DRIVE_HOSTS.has(host)) return null;

  // /file/d/{id}/…  /document/d/{id}/…  /spreadsheets/d/{id}/…  etc.
  // Also /document/u/0/d/{id}/…
  const pathMatch = url.pathname.match(
    /\/(?:file|document|spreadsheets|presentation|forms)\/(?:u\/\d+\/)?d\/([\w-]+)/i,
  );
  if (pathMatch?.[1] && FILE_ID_RE.test(pathMatch[1])) {
    const fileId = pathMatch[1];
    return { fileId, url: canonicalizeDriveUrl(host, url.pathname, fileId) };
  }

  // /drive/folders/{id} or /drive/u/0/folders/{id}
  const folderMatch = url.pathname.match(
    /\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/i,
  );
  if (folderMatch?.[1] && FILE_ID_RE.test(folderMatch[1])) {
    const fileId = folderMatch[1];
    return {
      fileId,
      url: `https://drive.google.com/drive/folders/${fileId}`,
    };
  }

  // /open?id={id}
  const openId = url.searchParams.get("id");
  if (openId && FILE_ID_RE.test(openId)) {
    return {
      fileId: openId,
      url: `https://drive.google.com/file/d/${openId}/view`,
    };
  }

  return null;
}

function canonicalizeDriveUrl(
  host: string,
  pathname: string,
  fileId: string,
): string {
  if (host === "docs.google.com") {
    if (pathname.includes("/spreadsheets/")) {
      return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
    }
    if (pathname.includes("/presentation/")) {
      return `https://docs.google.com/presentation/d/${fileId}/edit`;
    }
    if (pathname.includes("/forms/")) {
      return `https://docs.google.com/forms/d/${fileId}/edit`;
    }
    return `https://docs.google.com/document/d/${fileId}/edit`;
  }
  if (pathname.includes("/folders/")) {
    return `https://drive.google.com/drive/folders/${fileId}`;
  }
  return `https://drive.google.com/file/d/${fileId}/view`;
}
