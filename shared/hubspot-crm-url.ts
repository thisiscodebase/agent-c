/**
 * Parse HubSpot CRM record URLs (contacts / companies) for composer paste-to-chip.
 *
 * Supported shapes (portal id optional in the sense we ignore it for lookup):
 * - https://app.hubspot.com/contacts/{portal}/record/0-1/{id}
 * - https://app-eu1.hubspot.com/contacts/{portal}/record/0-1/{id} (regional)
 * - https://app.hubspot.com/contacts/{portal}/record/0-2/{id}
 * - https://app.hubspot.com/contacts/{portal}/contact/{id}
 * - https://app.hubspot.com/contacts/{portal}/company/{id}
 */

export type HubspotObjectKind = "contact" | "company";

export type ParsedHubspotCrmUrl = {
  kind: HubspotObjectKind;
  /** Numeric HubSpot object id as a string. */
  objectId: string;
  portalId?: string;
  /** App URL without query noise; keeps regional host when present. */
  url: string;
};

/** Match HubSpot app hosts including regional shards (app-eu1, app-na1, …). */
function isHubspotAppHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "app.hubspot.com" ||
    host === "hubspot.com" ||
    /^app(?:-[a-z0-9]+)?\.hubspot\.com$/i.test(host)
  );
}

function stripClipboardNoise(text: string): string {
  return text
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^<|>$/g, "")
    .replace(/^["']|["']$/g, "");
}

/** HubSpot object-type ids in `/record/{typeId}/…` paths. */
const RECORD_TYPE_TO_KIND: Record<string, HubspotObjectKind> = {
  "0-1": "contact",
  "0-2": "company",
};

export function hubspotKindToObjectType(
  kind: HubspotObjectKind,
): "CONTACT" | "COMPANY" {
  switch (kind) {
    case "contact":
      return "CONTACT";
    case "company":
      return "COMPANY";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function hubspotKindLabel(kind: HubspotObjectKind): string {
  switch (kind) {
    case "contact":
      return "Contact";
    case "company":
      return "Company";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Composer / agent ref id for HubSpot: `contact:123` or `company:456`.
 * Kept stable so detail-panel `?ref=hubspot:contact:123` still parses
 * (first colon = service, remainder = id).
 */
export function formatHubspotRefId(
  kind: HubspotObjectKind,
  objectId: string,
): string {
  return `${kind}:${objectId}`;
}

export function parseHubspotRefId(
  refId: string,
): { kind: HubspotObjectKind; objectId: string } | null {
  const colon = refId.indexOf(":");
  if (colon <= 0) return null;
  const kind = refId.slice(0, colon);
  const objectId = refId.slice(colon + 1).trim();
  if (!objectId || !/^\d+$/.test(objectId)) return null;
  if (kind !== "contact" && kind !== "company") return null;
  return { kind, objectId };
}

/** Fallback chip label before MCP resolves the display name. */
export function hubspotFallbackName(
  kind: HubspotObjectKind,
  objectId: string,
): string {
  return `${hubspotKindLabel(kind)} ${objectId}`;
}

/**
 * True when clipboard text is effectively a single HubSpot CRM URL
 * (optional surrounding whitespace / zero-width / quote noise).
 */
export function isSoleHubspotCrmUrl(text: string): boolean {
  const cleaned = stripClipboardNoise(text);
  if (!cleaned || /\s/.test(cleaned)) return false;
  return parseHubspotCrmUrl(cleaned) !== null;
}

/**
 * Pull a HubSpot CRM URL from plain text or HTML clipboard payloads.
 * Prefers a sole URL; otherwise takes the first matching href / URL token.
 */
export function extractHubspotCrmUrl(args: {
  plain?: string;
  html?: string;
}): ParsedHubspotCrmUrl | null {
  const plain = args.plain ? stripClipboardNoise(args.plain) : "";
  if (plain && !/\s/.test(plain)) {
    const sole = parseHubspotCrmUrl(plain);
    if (sole) return sole;
  }

  if (args.html) {
    const hrefMatch = args.html.match(
      /href=["'](https?:\/\/[^"']*hubspot\.com[^"']*)["']/i,
    );
    if (hrefMatch?.[1]) {
      const fromHref = parseHubspotCrmUrl(hrefMatch[1]);
      if (fromHref) return fromHref;
    }
  }

  if (plain) {
    const urlToken = plain.match(
      /https?:\/\/[^\s<>"']*hubspot\.com[^\s<>"']*/i,
    );
    if (urlToken?.[0]) {
      return parseHubspotCrmUrl(urlToken[0].replace(/[),.;]+$/, ""));
    }
  }

  return null;
}

export function parseHubspotCrmUrl(raw: string): ParsedHubspotCrmUrl | null {
  let url: URL;
  try {
    url = new URL(stripClipboardNoise(raw));
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!isHubspotAppHost(host)) {
    return null;
  }

  // /contacts/{portalId}/record/{typeId}/{objectId}
  const record = url.pathname.match(
    /^\/contacts\/(\d+)\/record\/(0-\d+)\/(\d+)\/?$/i,
  );
  if (record) {
    const portalId = record[1];
    const typeId = record[2];
    const objectId = record[3];
    const kind = typeId ? RECORD_TYPE_TO_KIND[typeId] : undefined;
    if (!kind || !objectId || !portalId) return null;
    return {
      kind,
      objectId,
      portalId,
      url: `https://${host}/contacts/${portalId}/record/${typeId}/${objectId}`,
    };
  }

  // Legacy: /contacts/{portalId}/contact/{id} or /company/{id}
  const legacy = url.pathname.match(
    /^\/contacts\/(\d+)\/(contact|company)\/(\d+)\/?$/i,
  );
  if (legacy) {
    const portalId = legacy[1];
    const segment = legacy[2]?.toLowerCase();
    const objectId = legacy[3];
    if (!portalId || !objectId) return null;
    const kind: HubspotObjectKind | null =
      segment === "contact"
        ? "contact"
        : segment === "company"
          ? "company"
          : null;
    if (!kind) return null;
    const typeId = kind === "contact" ? "0-1" : "0-2";
    return {
      kind,
      objectId,
      portalId,
      url: `https://${host}/contacts/${portalId}/record/${typeId}/${objectId}`,
    };
  }

  return null;
}
