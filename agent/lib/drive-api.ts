/** Shared Drive API v3 helpers for temporary REST tools (MCP workaround). */

export const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export const DRIVE_FILE_FIELDS =
  "files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName,emailAddress),driveId),nextPageToken";

export const DRIVE_META_FIELDS =
  "id,name,mimeType,modifiedTime,webViewLink,owners(displayName,emailAddress),size,md5Checksum,driveId,parents";

/** Soft cap on exported / downloaded text returned to the model. */
export const DRIVE_CONTENT_MAX_CHARS = 200_000;

export type DriveFileSummary = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  driveId?: string;
  parents?: string[];
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
};

type DriveListResponse = {
  files?: DriveFileSummary[];
  nextPageToken?: string;
};

type DriveErrorBody = {
  error?: { message?: string; status?: string; code?: number };
};

type SharedDriveInfo = {
  id: string;
  name: string;
  kind?: string;
};

export function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Build a Drive `q` from free text: name or fullText contains. */
export function buildDriveSearchQuery(query: string): string {
  const escaped = escapeDriveQueryValue(query.trim());
  return `(name contains '${escaped}' or fullText contains '${escaped}') and trashed = false`;
}

/** Extract a Drive file/folder id from a bare id or Google Docs/Drive URL. */
export function extractDriveId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(
    /(?:docs|drive)\.google\.com\/(?:document|spreadsheets|presentation|file|drive\/(?:u\/\d+\/)?folders)\/(?:d\/)?([a-zA-Z0-9_-]+)/,
  );
  if (fromUrl?.[1]) return fromUrl[1];

  const openId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openId?.[1]) return openId[1];

  // Bare Drive ids are typically 25–44 chars of [A-Za-z0-9_-]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

/** Shared Drive ids usually start with `0A` and are shorter than file ids. */
export function looksLikeSharedDriveId(id: string): boolean {
  return /^0A[a-zA-Z0-9_-]{10,}$/.test(id);
}

export function mapDriveFiles(files: DriveFileSummary[] | undefined): DriveFileSummary[] {
  return (files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
    driveId: file.driveId,
    parents: file.parents,
    owners: file.owners,
  }));
}

export function accessHintForNotFound(id: string): string {
  return [
    `Drive API error: File not found: ${id}.`,
    "Google returns this when the *connected* OAuth account cannot see the item (including Shared Drive membership), not only when it is deleted.",
    "Confirm Settings → Integrations → Google Drive was connected with the same Google account that opens the link in the browser, and that account is a member of the Shared Drive if applicable.",
  ].join(" ");
}

export async function driveFetchJson<T>(
  token: string,
  url: string,
): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    let code: number | undefined;
    try {
      const body = await res.json() as DriveErrorBody;
      if (body.error?.message) {
        detail = body.error.message;
      }
      code = body.error?.code;
    } catch {
      // ignore parse errors
    }
    const notFound = code === 404 || /not found/i.test(detail);
    if (notFound) {
      const idMatch = detail.match(/File not found:\s*([^\s.]+)/i)
        ?? url.match(/\/files\/([^/?]+)/);
      throw new Error(accessHintForNotFound(idMatch?.[1] ?? "unknown"));
    }
    throw new Error(`Drive API error: ${detail}`);
  }

  return res.json() as Promise<T>;
}

/** Default list/search params so Shared Drive items are included. */
export function applySharedDriveListParams(params: URLSearchParams): void {
  params.set("supportsAllDrives", "true");
  params.set("includeItemsFromAllDrives", "true");
  params.set("corpora", "allDrives");
}

export async function listDriveFiles(
  token: string,
  params: URLSearchParams,
): Promise<{ files: DriveFileSummary[]; nextPageToken?: string }> {
  applySharedDriveListParams(params);
  const url = `${DRIVE_API_BASE}/files?${params.toString()}`;
  const data = await driveFetchJson<DriveListResponse>(token, url);
  return {
    files: mapDriveFiles(data.files),
    nextPageToken: data.nextPageToken || undefined,
  };
}

export async function getDriveFileMetadata(
  token: string,
  fileId: string,
): Promise<DriveFileSummary & { size?: string; md5Checksum?: string }> {
  const params = new URLSearchParams({
    fields: DRIVE_META_FIELDS,
    supportsAllDrives: "true",
  });
  const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params}`;
  const file = await driveFetchJson<DriveFileSummary & { size?: string; md5Checksum?: string }>(
    token,
    url,
  );
  return {
    ...file,
    webViewLink: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
  };
}

export async function getSharedDrive(
  token: string,
  driveId: string,
): Promise<SharedDriveInfo> {
  const params = new URLSearchParams({ fields: "id,name,kind" });
  const url = `${DRIVE_API_BASE}/drives/${encodeURIComponent(driveId)}?${params}`;
  return driveFetchJson<SharedDriveInfo>(token, url);
}

/**
 * If `query` is a Drive URL or bare id, resolve via files.get / drives.get
 * instead of full-text search (searching for an id string never finds the file).
 */
export async function resolveDriveIdQuery(
  token: string,
  query: string,
): Promise<{
  files: DriveFileSummary[];
  resolvedAs: "file" | "shared_drive";
  note?: string;
} | null> {
  const id = extractDriveId(query);
  if (!id) return null;

  if (looksLikeSharedDriveId(id)) {
    try {
      const drive = await getSharedDrive(token, id);
      return {
        files: [{
          id: drive.id,
          name: drive.name,
          mimeType: "application/vnd.google-apps.folder",
          webViewLink: `https://drive.google.com/drive/folders/${drive.id}`,
          driveId: drive.id,
        }],
        resolvedAs: "shared_drive",
        note: "Resolved as a Shared Drive id (not a file). List children with search_drive using a name query, or open folders the user can access.",
      };
    } catch (error) {
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          `Id ${id} looks like a Shared Drive. The connected account must be a member of that drive.`,
        ].join(" "),
      );
    }
  }

  const file = await getDriveFileMetadata(token, id);
  return { files: [file], resolvedAs: "file" };
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
    mimeType.startsWith("text/")
    || mimeType === "application/json"
    || mimeType === "application/xml"
    || mimeType === "application/javascript"
    || mimeType.endsWith("+json")
    || mimeType.endsWith("+xml")
  );
}

async function readTextResponse(res: Response): Promise<string> {
  const text = await res.text();
  if (text.length <= DRIVE_CONTENT_MAX_CHARS) {
    return text;
  }
  return `${text.slice(0, DRIVE_CONTENT_MAX_CHARS)}\n\n[truncated at ${DRIVE_CONTENT_MAX_CHARS} characters]`;
}

/**
 * Read file content as text. Google Workspace files are exported;
 * other text-like files use alt=media. Unsupported binaries throw.
 */
export async function readDriveFileContent(
  token: string,
  fileIdOrUrl: string,
): Promise<{
  metadata: DriveFileSummary;
  content: string;
  exportMimeType?: string;
}> {
  const fileId = extractDriveId(fileIdOrUrl) ?? fileIdOrUrl.trim();
  const metadata = await getDriveFileMetadata(token, fileId);
  const exportType = exportMimeType(metadata.mimeType);

  let url: string;
  if (exportType) {
    const params = new URLSearchParams({ mimeType: exportType });
    url = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/export?${params}`;
  } else if (isLikelyTextMime(metadata.mimeType) || metadata.mimeType === "application/pdf") {
    if (metadata.mimeType === "application/pdf") {
      throw new Error(
        `Cannot read PDF content as text via this temporary Drive REST tool (file "${metadata.name}"). Open ${metadata.webViewLink} instead.`,
      );
    }
    const params = new URLSearchParams({
      alt: "media",
      supportsAllDrives: "true",
    });
    url = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params}`;
  } else if (metadata.mimeType.startsWith("application/vnd.google-apps.")) {
    throw new Error(
      `Unsupported Google Workspace type "${metadata.mimeType}" for file "${metadata.name}".`,
    );
  } else {
    throw new Error(
      `Cannot read binary file "${metadata.name}" (${metadata.mimeType}) as text. Use the Drive link: ${metadata.webViewLink}`,
    );
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json() as DriveErrorBody;
      if (body.error?.message) {
        detail = body.error.message;
      }
    } catch {
      // ignore
    }
    if (/not found/i.test(detail)) {
      throw new Error(accessHintForNotFound(fileId));
    }
    throw new Error(`Drive read error: ${detail}`);
  }

  const content = await readTextResponse(res);
  return {
    metadata,
    content,
    exportMimeType: exportType ?? undefined,
  };
}
