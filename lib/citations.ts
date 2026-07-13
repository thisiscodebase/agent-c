import type { EveMessage, EveMessagePart } from "eve/react";
import { getBrandTintClass } from "~/lib/tool-icons";

export type CitationSource =
  | "web"
  | "hubspot"
  | "notion"
  | "slack"
  | "drive"
  | "tally"
  | "platform"
  | "unknown";

export type Citation = {
  url: string;
  title?: string;
  source: CitationSource;
  toolName?: string;
};

const URL_KEYS = new Set([
  "url",
  "permalink",
  "weburl",
  "link",
  "href",
  "uri",
  "pageurl",
  "web_url",
  "public_url",
]);

const TITLE_KEYS = new Set([
  "title",
  "name",
  "label",
  "channel_name",
  "filename",
  "file_name",
]);

const MAX_CITATIONS = 40;
const MAX_SCAN_DEPTH = 6;

const CONNECTOR_HOST_PATTERNS: Array<{
  source: Exclude<CitationSource, "web" | "unknown">;
  test: (hostname: string) => boolean;
}> = [
  {
    source: "hubspot",
    test: (h) => h === "app.hubspot.com" || h.endsWith(".hubspot.com"),
  },
  {
    source: "notion",
    test: (h) =>
      h === "notion.so" || h.endsWith(".notion.so") || h === "www.notion.so",
  },
  {
    source: "slack",
    test: (h) =>
      h === "slack.com"
      || h.endsWith(".slack.com")
      || h === "app.slack.com",
  },
  {
    source: "drive",
    test: (h) =>
      h === "drive.google.com"
      || h === "docs.google.com"
      || h === "sheets.google.com"
      || h === "slides.google.com",
  },
  {
    source: "tally",
    test: (h) => h === "tally.so" || h.endsWith(".tally.so"),
  },
  {
    source: "platform",
    test: (h) =>
      // Workspace subdomain local (`techscaler.localhost`) and hosted Platform.
      h.endsWith(".localhost")
      || h.endsWith(".thisiscodebase.com")
      || h === "platform-env-staging-thisiscodebase.vercel.app"
      || (h.includes("platform") && h.endsWith(".vercel.app")),
  },
];

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(getDomain(url))}`;
}

export function normalizeCitationUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    // Drop trailing slash on path-only URLs for stable dedupe.
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function classifyCitationSource(
  url: string,
  toolName?: string,
): CitationSource {
  const name = toolName?.toLowerCase() ?? "";

  if (
    name === "search_slack"
    || name.startsWith("slack__")
    || name.includes("slack")
  ) {
    return "slack";
  }
  if (name.startsWith("hubspot__") || name.includes("hubspot")) {
    return "hubspot";
  }
  if (name.startsWith("notion__") || name.includes("notion")) {
    return "notion";
  }
  if (name.startsWith("drive__") || name.includes("drive")) {
    return "drive";
  }
  if (name.startsWith("tally__") || name.includes("tally")) {
    return "tally";
  }
  if (name.startsWith("platform__") || name.includes("platform")) {
    return "platform";
  }
  if (
    name === "web_search"
    || name === "search_web"
    || name === "google_search"
    || name.includes("web_search")
  ) {
    return "web";
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const pattern of CONNECTOR_HOST_PATTERNS) {
      if (pattern.test(hostname)) return pattern.source;
    }
    return "web";
  } catch {
    return "unknown";
  }
}

/** Short label for inline pills (brand name or hostname). */
export function getCitationLabel(citation: Citation): string {
  switch (citation.source) {
    case "hubspot":
      return "HubSpot";
    case "notion":
      return "Notion";
    case "slack":
      return "Slack";
    case "drive":
      return "Drive";
    case "tally":
      return "Tally";
    case "platform":
      return "Platform";
    case "web":
    case "unknown":
      return getDomain(citation.url);
    default: {
      const _exhaustive: never = citation.source;
      return _exhaustive;
    }
  }
}

/** Background tint matching tool-call icon shells. */
export function getCitationTintClass(source: CitationSource): string {
  switch (source) {
    case "hubspot":
    case "notion":
    case "slack":
    case "drive":
    case "tally":
    case "platform":
      return getBrandTintClass(source);
    case "web":
      return "bg-sky-500/15";
    case "unknown":
      return "bg-muted";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

/** Longer title for source lists / hover cards. */
export function getCitationTitle(citation: Citation): string {
  const title = citation.title?.trim();
  if (title) return title;
  return getCitationLabel(citation);
}

export function isCitationWorthyUrl(
  url: string | undefined | null,
  citations: readonly Citation[] = [],
): url is string {
  if (!url || !isHttpUrl(url)) return false;

  const source = classifyCitationSource(url);
  // Connector permalinks always render as citation pills.
  if (source !== "web" && source !== "unknown") return true;

  const normalized = normalizeCitationUrl(url);
  return citations.some((c) => normalizeCitationUrl(c.url) === normalized);
}

const MARKDOWN_LINK_RE = /\[([^\]]*)\]\((https?:[^)\s]+)\)/g;

type LinkMatch = {
  index: number;
  length: number;
  label: string;
  url: string;
};

/**
 * Rewrite citation-worthy markdown links so:
 * - link labels stay as highlighted body text (`<cite-mark>`)
 * - source chips (`<citation>`) gather at the end of each sentence/clause
 */
export function transformCitationMarkdown(
  text: string,
  citations: readonly Citation[],
): string {
  const links: LinkMatch[] = [...text.matchAll(MARKDOWN_LINK_RE)]
    .map((match) => {
      const url = match[2]!;
      return {
        index: match.index ?? 0,
        length: match[0]!.length,
        label: match[1] ?? "",
        url,
      };
    })
    .filter((link) => isCitationWorthyUrl(link.url, citations));

  if (links.length === 0) return text;

  // Replace each worthy link with a highlighted mark, leaving a chip placeholder.
  // Placeholders are later moved to the end of the sentence.
  const PLACEHOLDER_PREFIX = "\uE000CITE:";
  const PLACEHOLDER_SUFFIX = "\uE000";

  let result = text;
  const placeholders: Array<{ token: string; url: string; index: number }> = [];

  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i]!;
    const source = classifyCitationSource(
      link.url,
      citations.find((c) => normalizeCitationUrl(c.url) === normalizeCitationUrl(link.url))
        ?.toolName,
    );
    const label = link.label.trim() || getCitationLabel({ url: link.url, source });
    const token = `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`;
    const mark =
      `<cite-mark source="${escapeAttr(source)}" url="${escapeAttr(link.url)}">`
      + escapeHtml(label)
      + `</cite-mark>${token}`;

    placeholders.push({ token, url: link.url, index: link.index });
    result = result.slice(0, link.index) + mark + result.slice(link.index + link.length);
  }

  // Move chip placeholders to the end of their sentence/clause.
  return relocateCitationPlaceholders(result, placeholders, PLACEHOLDER_PREFIX, PLACEHOLDER_SUFFIX);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Collect citation placeholders within each sentence and emit a single
 * `<citation urls="…">` chip group just after the sentence terminator.
 */
function relocateCitationPlaceholders(
  text: string,
  placeholders: Array<{ token: string; url: string }>,
  prefix: string,
  suffix: string,
): string {
  if (placeholders.length === 0) return text;

  const tokenRe = new RegExp(
    `${escapeRegExp(prefix)}(\\d+)${escapeRegExp(suffix)}`,
    "g",
  );

  // Split into segments ending at sentence boundaries (punctuation + space/end,
  // or a newline). Keep delimiters attached to the preceding segment.
  const segments = text.split(/(?<=[.!?])(?=\s|$)|(?<=\n)/);
  const urlByTokenIndex = new Map(
    placeholders.map((p) => {
      const match = p.token.match(new RegExp(`${escapeRegExp(prefix)}(\\d+)${escapeRegExp(suffix)}`));
      return [match?.[1] ?? "", p.url] as const;
    }),
  );

  return segments
    .map((segment) => {
      const urls: string[] = [];
      const cleaned = segment.replace(tokenRe, (_full, index: string) => {
        const url = urlByTokenIndex.get(index);
        if (url) urls.push(url);
        return "";
      });

      if (urls.length === 0) return cleaned;

      // Deduplicate while preserving order.
      const unique: string[] = [];
      for (const url of urls) {
        if (!unique.includes(url)) unique.push(url);
      }

      const chip = `<citation urls="${escapeAttr(unique.join("|||"))}"></citation>`;

      // Insert chip after trailing sentence punctuation, else at segment end
      // (before trailing whitespace/newlines).
      const punctMatch = cleaned.match(/^(.*?)([.!?]+)(\s*)$/s);
      if (punctMatch) {
        return `${punctMatch[1]}${punctMatch[2]}${chip}${punctMatch[3]}`;
      }

      const trailMatch = cleaned.match(/^(.*?)(\s*)$/s);
      if (trailMatch) {
        return `${trailMatch[1]}${chip}${trailMatch[2]}`;
      }

      return `${cleaned}${chip}`;
    })
    .join("");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pickTitle(record: Record<string, unknown>): string | undefined {
  for (const [key, value] of Object.entries(record)) {
    if (!TITLE_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function addCitation(
  map: Map<string, Citation>,
  url: string,
  title: string | undefined,
  toolName: string | undefined,
) {
  if (!isHttpUrl(url) || map.size >= MAX_CITATIONS) return;
  const normalized = normalizeCitationUrl(url);
  const existing = map.get(normalized);
  if (existing) {
    if (!existing.title && title) {
      map.set(normalized, { ...existing, title });
    }
    return;
  }
  map.set(normalized, {
    url: normalized,
    title,
    source: classifyCitationSource(normalized, toolName),
    toolName,
  });
}

function scanValue(
  value: unknown,
  map: Map<string, Citation>,
  toolName: string | undefined,
  depth: number,
  nearbyTitle?: string,
) {
  if (map.size >= MAX_CITATIONS || depth > MAX_SCAN_DEPTH || value == null) {
    return;
  }

  if (typeof value === "string") {
    if (isHttpUrl(value)) {
      addCitation(map, value, nearbyTitle, toolName);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      scanValue(item, map, toolName, depth + 1, nearbyTitle);
    }
    return;
  }

  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const title = pickTitle(record) ?? nearbyTitle;

  // Structured search / grounding shapes
  if (Array.isArray(record.sources)) {
    for (const source of record.sources) {
      if (!source || typeof source !== "object") continue;
      const s = source as Record<string, unknown>;
      if (typeof s.url === "string") {
        addCitation(
          map,
          s.url,
          typeof s.title === "string" ? s.title : title,
          toolName,
        );
      }
    }
  }

  const chunks =
    (Array.isArray(record.groundingChunks) ? record.groundingChunks : null)
    ?? (record.groundingMetadata
      && typeof record.groundingMetadata === "object"
      && Array.isArray(
        (record.groundingMetadata as { groundingChunks?: unknown }).groundingChunks,
      )
      ? (record.groundingMetadata as { groundingChunks: unknown[] }).groundingChunks
      : null);

  if (chunks) {
    for (const chunk of chunks) {
      if (!chunk || typeof chunk !== "object") continue;
      const web = (chunk as { web?: { uri?: string; title?: string } }).web;
      if (web?.uri) {
        addCitation(map, web.uri, web.title ?? title, toolName);
      }
    }
  }

  for (const [key, child] of Object.entries(record)) {
    const lower = key.toLowerCase();
    if (URL_KEYS.has(lower) && typeof child === "string" && isHttpUrl(child)) {
      addCitation(map, child, title, toolName);
      continue;
    }
    scanValue(child, map, toolName, depth + 1, title);
  }
}

function extractFromToolOutput(
  output: unknown,
  toolName: string,
  map: Map<string, Citation>,
) {
  if (output == null) return;

  // Top-level array of { url, title? }
  if (Array.isArray(output)) {
    for (const item of output) {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        if (typeof record.url === "string") {
          addCitation(
            map,
            record.url,
            typeof record.title === "string" ? record.title : undefined,
            toolName,
          );
          continue;
        }
      }
      scanValue(item, map, toolName, 0);
    }
    return;
  }

  scanValue(output, map, toolName, 0);
}

export function extractCitationsFromParts(
  parts: readonly EveMessagePart[],
): Citation[] {
  const map = new Map<string, Citation>();

  for (const part of parts) {
    if (part.type !== "dynamic-tool") continue;
    if (part.state !== "output-available") continue;
    if (!("output" in part) || part.output == null) continue;
    extractFromToolOutput(part.output, part.toolName, map);
  }

  // Also harvest citation-worthy markdown links from assistant text so the
  // Sources footer stays in sync with inline pills (connector hosts always;
  // web hosts only when already present from tool output above).
  const toolUrls = new Set(map.keys());
  for (const part of parts) {
    if (part.type !== "text") continue;
    for (const match of part.text.matchAll(MARKDOWN_LINK_RE)) {
      const url = match[2]!;
      if (!isHttpUrl(url)) continue;
      const source = classifyCitationSource(url);
      const normalized = normalizeCitationUrl(url);
      if (source !== "web" && source !== "unknown") {
        addCitation(map, url, match[1]?.trim() || undefined, undefined);
        continue;
      }
      if (toolUrls.has(normalized)) {
        const existing = map.get(normalized);
        if (existing && !existing.title && match[1]?.trim()) {
          map.set(normalized, { ...existing, title: match[1].trim() });
        }
      }
    }
  }

  return [...map.values()];
}

export function extractCitationsFromMessage(message: EveMessage): Citation[] {
  return extractCitationsFromParts(message.parts);
}

export function getAssistantMarkdown(message: EveMessage): string {
  return message.parts
    .filter((part): part is Extract<EveMessagePart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

export function isAssistantMessageComplete(message: EveMessage): boolean {
  if (message.role !== "assistant") return false;
  if (message.metadata?.status === "streaming") return false;
  return !message.parts.some(
    (part) =>
      (part.type === "text" || part.type === "reasoning")
      && part.state === "streaming",
  );
}

/** Find a citation matching a markdown link href, if any. */
export function findCitationForUrl(
  url: string,
  citations: readonly Citation[],
): Citation | undefined {
  const normalized = normalizeCitationUrl(url);
  const exact = citations.find((c) => normalizeCitationUrl(c.url) === normalized);
  if (exact) return exact;

  // Fall back to host-classified synthetic citation for connector/web links.
  if (!isHttpUrl(url)) return undefined;
  return {
    url: normalized,
    source: classifyCitationSource(normalized),
  };
}
