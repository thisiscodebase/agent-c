/**
 * Drive REST helpers for the composer `@` mention picker.
 * Kept in `server/` so the Next API route does not import from `agent/`.
 */

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_FILE_FIELDS =
  "files(id,name,mimeType,modifiedTime,createdTime,webViewLink,owners(displayName,emailAddress)),nextPageToken";

export type DriveRefItem = {
  id: string;
  name: string;
  url?: string;
  mimeType?: string;
  modifiedAt?: string;
  createdAt?: string;
  author?: string;
};

type DriveListResponse = {
  files?: Array<{
    id: string;
    name: string;
    mimeType?: string;
    modifiedTime?: string;
    createdTime?: string;
    webViewLink?: string;
    owners?: Array<{ displayName?: string; emailAddress?: string }>;
  }>;
  nextPageToken?: string;
};

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildDriveSearchQuery(query: string): string {
  const escaped = escapeDriveQueryValue(query.trim());
  return `(name contains '${escaped}' or fullText contains '${escaped}') and trashed = false`;
}

function applySharedDriveListParams(params: URLSearchParams): void {
  params.set("supportsAllDrives", "true");
  params.set("includeItemsFromAllDrives", "true");
  params.set("corpora", "allDrives");
}

async function driveFetchJson<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as {
        error?: { message?: string };
      };
      if (body.error?.message) detail = body.error.message;
    } catch {
      // ignore
    }
    throw new Error(`Drive API error: ${detail}`);
  }
  return res.json() as Promise<T>;
}

function mapFiles(
  files: DriveListResponse["files"],
): DriveRefItem[] {
  return (files ?? []).map((file) => {
    const owner = file.owners?.[0];
    const author =
      owner?.displayName?.trim() ||
      owner?.emailAddress?.trim() ||
      undefined;
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedAt: file.modifiedTime,
      createdAt: file.createdTime,
      author,
      url:
        file.webViewLink ??
        `https://drive.google.com/file/d/${file.id}/view`,
    };
  });
}

/** Recent Drive files (modifiedTime desc). */
export async function listRecentDriveRefs(
  token: string,
  pageSize = 12,
): Promise<DriveRefItem[]> {
  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields: DRIVE_FILE_FIELDS,
    orderBy: "modifiedTime desc",
    q: "trashed = false",
  });
  applySharedDriveListParams(params);
  const data = await driveFetchJson<DriveListResponse>(
    token,
    `${DRIVE_API_BASE}/files?${params}`,
  );
  return mapFiles(data.files);
}

/** Search Drive files by name / full text. */
export async function searchDriveRefs(
  token: string,
  query: string,
  pageSize = 12,
): Promise<DriveRefItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return listRecentDriveRefs(token, pageSize);

  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields: DRIVE_FILE_FIELDS,
    q: buildDriveSearchQuery(trimmed),
  });
  applySharedDriveListParams(params);
  const data = await driveFetchJson<DriveListResponse>(
    token,
    `${DRIVE_API_BASE}/files?${params}`,
  );
  return mapFiles(data.files);
}
