/**
 * A flat, object-store-shaped manifest: files are addressable by key, folders
 * are path prefixes. Modelled on Extend UI's File System data model
 * (https://ui.extend.ai/ui/docs/components/file-system#data-model) so a
 * manifest built here stays portable if we adopt that component, or start
 * listing real buckets alongside artifacts.
 */

export interface FileSystemFolderItem {
  kind: "folder";
  path: string;
  name?: string;
  updatedAt?: string;
}

export interface FileSystemFileItem {
  kind: "file";
  path: string;
  /** Stable identifier for the underlying object; defaults to `path`. */
  key?: string;
  name?: string;
  contentType?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, string>;
}

export type FileSystemItem = FileSystemFolderItem | FileSystemFileItem;

export interface FolderContents {
  folders: FileSystemFolderItem[];
  files: FileSystemFileItem[];
}

/** Trailing slash marks a prefix; the root is the empty string. */
export function normalizeFolderPath(path: string): string {
  if (!path) {
    return "";
  }

  return path.endsWith("/") ? path : `${path}/`;
}

export function itemName(item: FileSystemItem): string {
  if (item.name) {
    return item.name;
  }

  const segments = item.path.replace(/\/$/, "").split("/");
  return segments[segments.length - 1] ?? item.path;
}

export function parentFolderPath(path: string): string {
  const trimmed = path.replace(/\/$/, "");
  const cut = trimmed.lastIndexOf("/");
  return cut === -1 ? "" : trimmed.slice(0, cut + 1);
}

/** Breadcrumb trail from the root down to `path`, excluding the root itself. */
export function folderTrail(path: string): { name: string; path: string }[] {
  const segments = normalizeFolderPath(path).split("/").filter(Boolean);

  return segments.map((name, index) => ({
    name,
    path: `${segments.slice(0, index + 1).join("/")}/`,
  }));
}

/**
 * Direct children of `folderPath`. Folders are taken from explicit entries
 * where present and otherwise inferred from the prefixes of deeper files, so a
 * manifest never has to spell out its own hierarchy.
 */
export function folderContents(items: FileSystemItem[], folderPath: string): FolderContents {
  const prefix = normalizeFolderPath(folderPath);
  const folders = new Map<string, FileSystemFolderItem>();
  const files: FileSystemFileItem[] = [];

  for (const item of items) {
    if (item.kind === "folder") {
      const path = normalizeFolderPath(item.path);
      if (parentFolderPath(path) === prefix) {
        folders.set(path, { ...item, path });
      }
      continue;
    }

    if (!item.path.startsWith(prefix)) {
      continue;
    }

    const rest = item.path.slice(prefix.length);
    if (!rest) {
      continue;
    }

    const cut = rest.indexOf("/");
    if (cut === -1) {
      files.push(item);
      continue;
    }

    const path = `${prefix}${rest.slice(0, cut)}/`;
    if (!folders.has(path)) {
      folders.set(path, { kind: "folder", path });
    }
  }

  const byName = (a: FileSystemItem, b: FileSystemItem) =>
    itemName(a).localeCompare(itemName(b), undefined, { sensitivity: "base" });

  return {
    folders: [...folders.values()].sort(byName),
    files: files.sort(byName),
  };
}

export function countFilesUnder(items: FileSystemItem[], folderPath: string): number {
  const prefix = normalizeFolderPath(folderPath);
  return items.filter((item) => item.kind === "file" && item.path.startsWith(prefix)).length;
}

/**
 * Fixed locale and timezone: these dates are rendered on the server and again
 * on the client, and anything runtime-dependent produces a hydration mismatch.
 */
export function formatFileDate(value: string | number | undefined): string {
  if (value === undefined) {
    return "--";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

export function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) {
    return "--";
  }

  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${SIZE_UNITS[unit]}`;
}
