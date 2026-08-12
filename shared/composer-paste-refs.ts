/**
 * Detect Drive / Notion / HubSpot / Asana / Tally links in composer paste
 * payloads and build optimistic chip payloads (enrich via resolve API).
 */

import type { ComposerRefItem, ComposerRefService } from "./composer-refs.ts";
import {
  asanaFallbackName,
  formatAsanaRefId,
  isSoleAsanaUrl,
  parseAsanaUrl,
} from "./asana-url.ts";
import {
  driveFallbackName,
  isSoleDriveUrl,
  parseDriveUrl,
} from "./drive-url.ts";
import {
  formatHubspotRefId,
  hubspotFallbackName,
  isSoleHubspotCrmUrl,
  parseHubspotCrmUrl,
} from "./hubspot-crm-url.ts";
import {
  isSoleNotionUrl,
  notionFallbackName,
  parseNotionUrl,
} from "./notion-url.ts";
import {
  isSoleTallyUrl,
  parseTallyUrl,
  tallyFallbackName,
} from "./tally-url.ts";

export type ComposerPasteRef = {
  service: ComposerRefService;
  item: ComposerRefItem;
  /** URL sent to the resolve API for name enrichment. */
  resolveUrl: string;
};

function stripNoise(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

function firstHref(html: string, hostPattern: RegExp): string | null {
  const matches = html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi);
  for (const match of matches) {
    const href = match[1];
    if (href && hostPattern.test(href)) return href;
  }
  return null;
}

function firstUrlToken(plain: string, hostPattern: RegExp): string | null {
  const matches = plain.matchAll(/https?:\/\/[^\s<>"']+/gi);
  for (const match of matches) {
    const token = match[0]?.replace(/[),.;]+$/, "");
    if (token && hostPattern.test(token)) return token;
  }
  return null;
}

function parseKnownUrl(raw: string): ComposerPasteRef | null {
  const hubspot = parseHubspotCrmUrl(raw);
  if (hubspot) {
    return {
      service: "hubspot",
      resolveUrl: hubspot.url,
      item: {
        id: formatHubspotRefId(hubspot.kind, hubspot.objectId),
        name: hubspotFallbackName(hubspot.kind, hubspot.objectId),
        url: hubspot.url,
        mimeType: `hubspot/${hubspot.kind}`,
      },
    };
  }

  const asana = parseAsanaUrl(raw);
  if (asana) {
    return {
      service: "asana",
      resolveUrl: asana.url,
      item: {
        id: formatAsanaRefId(asana.kind, asana.objectId),
        name: asanaFallbackName(asana.kind, asana.objectId),
        url: asana.url,
        mimeType: `asana/${asana.kind}`,
      },
    };
  }

  const tally = parseTallyUrl(raw);
  if (tally) {
    return {
      service: "tally",
      resolveUrl: tally.url,
      item: {
        id: tally.formId,
        name: tallyFallbackName(tally.formId),
        url: tally.url,
        mimeType: "tally/form",
      },
    };
  }

  const drive = parseDriveUrl(raw);
  if (drive) {
    return {
      service: "drive",
      resolveUrl: drive.url,
      item: {
        id: drive.fileId,
        name: driveFallbackName(drive.fileId),
        url: drive.url,
      },
    };
  }

  const notion = parseNotionUrl(raw);
  if (notion) {
    return {
      service: "notion",
      resolveUrl: notion.url,
      item: {
        id: notion.pageId,
        name: notionFallbackName(notion.pageId, notion.titleHint),
        url: notion.url,
        mimeType: "notion/page",
      },
    };
  }

  return null;
}

/**
 * Extract a single composer ref from plain/HTML clipboard data.
 * Prefers a sole URL; otherwise takes the first matching connector href/token.
 */
export function extractComposerPasteRef(args: {
  plain?: string;
  html?: string;
}): ComposerPasteRef | null {
  const plain = args.plain ? stripNoise(args.plain) : "";

  if (plain && !/\s/.test(plain)) {
    const sole = parseKnownUrl(plain);
    if (sole) return sole;
  }

  if (args.html) {
    const href =
      firstHref(args.html, /hubspot\.com/i) ??
      firstHref(args.html, /asana\.com/i) ??
      firstHref(args.html, /tally\.so/i) ??
      firstHref(args.html, /(?:drive|docs|sheets|slides)\.google\.com/i) ??
      firstHref(args.html, /notion\.so/i);
    if (href) {
      const fromHref = parseKnownUrl(href);
      if (fromHref) return fromHref;
    }
  }

  if (plain) {
    const token =
      firstUrlToken(plain, /hubspot\.com/i) ??
      firstUrlToken(plain, /asana\.com/i) ??
      firstUrlToken(plain, /tally\.so/i) ??
      firstUrlToken(plain, /(?:drive|docs|sheets|slides)\.google\.com/i) ??
      firstUrlToken(plain, /notion\.so/i);
    if (token) return parseKnownUrl(token);
  }

  return null;
}

/** Whether this paste should become a chip (not a multi-line blob with a URL). */
export function shouldChipComposerPaste(args: {
  plain?: string;
  html?: string;
  parsed: ComposerPasteRef | null;
}): boolean {
  if (!args.parsed) return false;
  const plain = args.plain ?? "";
  const plainTrimmed = plain.trim();

  if (
    isSoleHubspotCrmUrl(plain) ||
    isSoleAsanaUrl(plain) ||
    isSoleTallyUrl(plain) ||
    isSoleDriveUrl(plain) ||
    isSoleNotionUrl(plain)
  ) {
    return true;
  }

  // Short "Copy link" payloads (title + html href), not multi-line docs.
  if (
    Boolean(args.html) &&
    plainTrimmed.length < 120 &&
    !/\n/.test(plainTrimmed)
  ) {
    return true;
  }

  return false;
}
