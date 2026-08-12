/**
 * Parse Notion page URLs for composer paste-to-chip.
 *
 * Page ids are 32 hex chars (with or without UUID dashes), usually at the end
 * of the path slug: `https://www.notion.so/Title-Words-<32hex>`.
 */

export type ParsedNotionUrl = {
  pageId: string;
  /** Compact 32-hex id (no dashes) — Notion MCP accepts either form. */
  compactId: string;
  titleHint?: string;
  url: string;
};

function stripClipboardNoise(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

function toCompactId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

function toDashedId(compact: string): string | null {
  if (!/^[a-f0-9]{32}$/i.test(compact)) return null;
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20),
  ].join("-");
}

function isNotionHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "notion.so" ||
    host === "www.notion.so" ||
    host.endsWith(".notion.so")
  );
}

/** Humanize a Notion URL slug title (before the trailing page id). */
export function notionTitleFromSlug(
  slug: string,
  compactId: string,
): string | undefined {
  let body = slug;
  const lower = slug.toLowerCase();
  const idx = lower.lastIndexOf(compactId);
  if (idx >= 0) {
    body = slug.slice(0, idx).replace(/-+$/, "");
  } else {
    body = slug.replace(
      /-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
      "",
    );
  }
  const title = body
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return title || undefined;
}

export function notionFallbackName(
  pageId: string,
  titleHint?: string,
): string {
  if (titleHint?.trim()) return titleHint.trim();
  const compact = toCompactId(pageId);
  const short = `${compact.slice(0, 6)}…${compact.slice(-4)}`;
  return `Notion ${short}`;
}

export function isSoleNotionUrl(text: string): boolean {
  const cleaned = stripClipboardNoise(text);
  if (!cleaned || /\s/.test(cleaned)) return false;
  return parseNotionUrl(cleaned) !== null;
}

export function parseNotionUrl(raw: string): ParsedNotionUrl | null {
  let url: URL;
  try {
    url = new URL(stripClipboardNoise(raw));
  } catch {
    return null;
  }

  if (!isNotionHost(url.hostname)) return null;

  for (const key of ["p", "pageId", "page_id"]) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    const compact = toCompactId(value);
    if (!/^[a-f0-9]{32}$/i.test(compact)) continue;
    const dashed = toDashedId(compact) ?? compact;
    return {
      pageId: dashed,
      compactId: compact,
      url: `https://www.notion.so/${compact}`,
    };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1);
  if (!last) return null;

  // Bare 32-hex or dashed UUID path segment
  if (/^[a-f0-9]{32}$/i.test(last)) {
    const compact = last.toLowerCase();
    return {
      pageId: toDashedId(compact) ?? compact,
      compactId: compact,
      url: `https://www.notion.so/${compact}`,
    };
  }
  if (
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      last,
    )
  ) {
    const compact = toCompactId(last);
    return {
      pageId: last,
      compactId: compact,
      url: `https://www.notion.so/${compact}`,
    };
  }

  // Slug-Title-Words-{32hex}
  const trailingHex = last.match(/([a-f0-9]{32})$/i);
  if (trailingHex?.[1]) {
    const compact = trailingHex[1].toLowerCase();
    return {
      pageId: toDashedId(compact) ?? compact,
      compactId: compact,
      titleHint: notionTitleFromSlug(last, compact),
      url: `https://www.notion.so/${last}`,
    };
  }

  // Slug ending with dashed UUID
  const trailingUuid = last.match(
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i,
  );
  if (trailingUuid?.[1]) {
    const compact = toCompactId(trailingUuid[1]);
    return {
      pageId: trailingUuid[1],
      compactId: compact,
      titleHint: notionTitleFromSlug(last, compact),
      url: `https://www.notion.so/${last}`,
    };
  }

  return null;
}
