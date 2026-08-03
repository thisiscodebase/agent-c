const STORAGE_KEY = "agent-c:recent-docs";
const MAX_RECENTS = 24;

interface RecentEntry {
  id: string;
  openedAt: number;
}

function readEntries(): RecentEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is RecentEntry => (
        !!entry
        && typeof entry === "object"
        && typeof (entry as RecentEntry).id === "string"
        && typeof (entry as RecentEntry).openedAt === "number"
      ))
      .sort((a, b) => b.openedAt - a.openedAt)
      .slice(0, MAX_RECENTS);
  }
  catch {
    return [];
  }
}

function writeEntries(entries: RecentEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_RECENTS)),
  );
}

/** Record that the user opened an artifact (newest first, deduped). */
export function recordArtifactOpen(id: string) {
  const trimmed = id.trim();
  if (!trimmed) {
    return;
  }

  const next = [
    { id: trimmed, openedAt: Date.now() },
    ...readEntries().filter((entry) => entry.id !== trimmed),
  ].slice(0, MAX_RECENTS);

  writeEntries(next);
}

/** Recent artifact ids, newest open first. */
export function listRecentArtifactIds(): string[] {
  return readEntries().map((entry) => entry.id);
}
