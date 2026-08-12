/**
 * Parse Tally form URLs for composer paste-to-chip.
 *
 * Supported shapes:
 * - https://tally.so/r/{formId}
 * - https://tally.so/forms/{formId}
 * - https://tally.so/forms/{formId}/edit (and other trailing segments)
 */

export type ParsedTallyUrl = {
  formId: string;
  url: string;
};

/** Public share ids are short alphanumeric (e.g. ZjyKAV, wzO0P0). */
const FORM_ID_RE = /^[A-Za-z0-9_-]{3,32}$/;

function stripClipboardNoise(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

function isTallyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "tally.so" || host.endsWith(".tally.so");
}

export function tallyFallbackName(formId: string): string {
  return `Tally ${formId}`;
}

export function isSoleTallyUrl(text: string): boolean {
  const cleaned = stripClipboardNoise(text);
  if (!cleaned || /\s/.test(cleaned)) return false;
  return parseTallyUrl(cleaned) !== null;
}

export function parseTallyUrl(raw: string): ParsedTallyUrl | null {
  let url: URL;
  try {
    url = new URL(stripClipboardNoise(raw));
  } catch {
    return null;
  }

  if (!isTallyHost(url.hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  // /r/{formId}  or  /forms/{formId}[/…]
  const kind = parts[0]?.toLowerCase();
  const formId = parts[1];
  if (!formId || !FORM_ID_RE.test(formId)) return null;

  if (kind === "r" || kind === "forms") {
    return {
      formId,
      url: `https://tally.so/r/${formId}`,
    };
  }

  return null;
}
