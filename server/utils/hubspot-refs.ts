/**
 * HubSpot MCP search / fetch for composer `@` mentions and paste-to-chip.
 * Uses Streamable HTTP against mcp.hubspot.com with a Connect-minted token.
 */

import {
  formatHubspotRefId,
  hubspotKindLabel,
  hubspotKindToObjectType,
  parseHubspotCrmUrl,
  parseHubspotRefId,
  type HubspotObjectKind,
} from "#shared/hubspot-crm-url";
import type { ComposerRefItem } from "#shared/composer-refs";

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string };
};

type HubspotMcpSession = {
  token: string;
  sessionId: string;
  expiresAt: number;
};

let hubspotMcpSession: HubspotMcpSession | null = null;
const HUBSPOT_SESSION_TTL_MS = 4 * 60_000;

export type HubspotSearchResult = {
  items: ComposerRefItem[];
  session: "new" | "reused";
};

export type HubspotRefDetail = ComposerRefItem & {
  bodyMarkdown?: string;
  bodyNote?: string;
};

const CONTACT_PROPS = [
  "firstname",
  "lastname",
  "email",
  "jobtitle",
  "company",
  "hs_full_name_or_email",
] as const;

const COMPANY_PROPS = ["name", "domain", "website"] as const;

/**
 * Search HubSpot contacts + companies for the `@` picker.
 * Empty query → recent-ish by last modified (bounded).
 */
export async function searchHubspotRefs(
  token: string,
  query: string,
  limit = 12,
): Promise<HubspotSearchResult> {
  const q = query.trim();
  const perType = Math.max(4, Math.ceil(limit / 2));

  const [contacts, companies] = await Promise.all([
    searchOneType(token, "contact", q, perType),
    searchOneType(token, "company", q, perType),
  ]);

  const session =
    contacts.session === "new" || companies.session === "new"
      ? "new"
      : "reused";

  const merged = [...contacts.items, ...companies.items].sort((a, b) => {
    const am = a.modifiedAt ? Date.parse(a.modifiedAt) : 0;
    const bm = b.modifiedAt ? Date.parse(b.modifiedAt) : 0;
    return bm - am;
  });

  return { items: merged.slice(0, limit), session };
}

export async function fetchHubspotRefDetail(
  token: string,
  refId: string,
  fallbackName?: string,
): Promise<HubspotRefDetail> {
  const parsed = parseHubspotRefId(refId);
  if (!parsed) {
    throw new Error("Invalid HubSpot ref id (expected contact:ID or company:ID)");
  }

  const fallback: HubspotRefDetail = {
    id: formatHubspotRefId(parsed.kind, parsed.objectId),
    name:
      fallbackName ||
      `${hubspotKindLabel(parsed.kind)} ${parsed.objectId}`,
    mimeType: `hubspot/${parsed.kind}`,
    bodyNote:
      "Couldn’t load a live HubSpot preview. The reference id is still valid for chat.",
  };

  try {
    const item = await getOneObject(token, parsed.kind, parsed.objectId);
    if (!item) {
      return {
        ...fallback,
        bodyNote: "Record not found in HubSpot (or you may lack access).",
      };
    }
    return {
      ...item,
      bodyMarkdown: formatHubspotPreview(parsed.kind, item),
    };
  } catch {
    return fallback;
  }
}

/** Resolve a pasted HubSpot CRM URL to a composer ref item. */
export async function resolveHubspotCrmUrl(
  token: string,
  rawUrl: string,
): Promise<ComposerRefItem> {
  const parsed = parseHubspotCrmUrl(rawUrl);
  if (!parsed) {
    throw new Error("Not a HubSpot contact or company URL");
  }

  const item = await getOneObject(token, parsed.kind, parsed.objectId);
  if (item) {
    return { ...item, url: item.url ?? parsed.url };
  }

  // Still chip-able with a fallback label when MCP can't fetch the record.
  return {
    id: formatHubspotRefId(parsed.kind, parsed.objectId),
    name: `${hubspotKindLabel(parsed.kind)} ${parsed.objectId}`,
    url: parsed.url,
    mimeType: `hubspot/${parsed.kind}`,
  };
}

async function searchOneType(
  token: string,
  kind: HubspotObjectKind,
  query: string,
  limit: number,
): Promise<HubspotSearchResult> {
  const objectType = hubspotKindToObjectType(kind);
  const properties =
    kind === "contact" ? [...CONTACT_PROPS] : [...COMPANY_PROPS];

  const args: Record<string, unknown> = {
    objectType,
    properties,
    limit,
    sorts: [
      {
        propertyName:
          kind === "contact" ? "lastmodifieddate" : "hs_lastmodifieddate",
        direction: "DESCENDING",
      },
    ],
  };
  if (query) args.query = query;

  const { result, session } = await callHubspotMcpTool(
    token,
    "search_crm_objects",
    args,
  );

  return {
    items: parseSearchResults(result, kind, limit),
    session,
  };
}

async function getOneObject(
  token: string,
  kind: HubspotObjectKind,
  objectId: string,
): Promise<ComposerRefItem | null> {
  const numericId = Number(objectId);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;

  const properties =
    kind === "contact" ? [...CONTACT_PROPS] : [...COMPANY_PROPS];

  const { result } = await callHubspotMcpTool(token, "get_crm_objects", {
    objectType: hubspotKindToObjectType(kind),
    objectIds: [numericId],
    properties,
  });

  return parseGetResult(result, kind, objectId);
}

function formatHubspotPreview(
  kind: HubspotObjectKind,
  item: ComposerRefItem,
): string {
  const lines = [
    `**${hubspotKindLabel(kind)}** · ${item.name}`,
  ];
  if (item.author) lines.push(`Email / domain: ${item.author}`);
  if (item.url) lines.push(`[Open in HubSpot](${item.url})`);
  lines.push("");
  lines.push(
    `_Composer reference \`${item.id}\`. Ask Agent C for a fuller CRM digest._`,
  );
  return lines.join("\n");
}

function parseSearchResults(
  result: unknown,
  kind: HubspotObjectKind,
  limit: number,
): ComposerRefItem[] {
  const rows = extractObjectRows(result);
  const items: ComposerRefItem[] = [];
  for (const row of rows) {
    const item = mapObjectRow(row, kind);
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

function parseGetResult(
  result: unknown,
  kind: HubspotObjectKind,
  expectedId: string,
): ComposerRefItem | null {
  const rows = extractObjectRows(result);
  for (const row of rows) {
    const item = mapObjectRow(row, kind);
    if (item && (item.id.endsWith(`:${expectedId}`) || item.id === formatHubspotRefId(kind, expectedId))) {
      return item;
    }
  }
  // If HubSpot returned something without matching id filter, take first.
  for (const row of rows) {
    const item = mapObjectRow(row, kind);
    if (item) return item;
  }
  return null;
}

function extractObjectRows(result: unknown): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    if (Array.isArray(obj.content)) {
      for (const part of obj.content) {
        if (
          part &&
          typeof part === "object" &&
          (part as { type?: string }).type === "text" &&
          typeof (part as { text?: string }).text === "string"
        ) {
          tryParseJsonBlob((part as { text: string }).text, visit);
        } else {
          visit(part);
        }
      }
    }

    if (Array.isArray(obj.results)) {
      for (const entry of obj.results) {
        if (entry && typeof entry === "object") {
          rows.push(entry as Record<string, unknown>);
        }
      }
    }

    if (Array.isArray(obj.objects)) {
      for (const entry of obj.objects) {
        if (entry && typeof entry === "object") {
          rows.push(entry as Record<string, unknown>);
        }
      }
    }

    if (
      (obj.id != null || obj.hs_object_id != null) &&
      (obj.properties || obj.displayName || obj.url)
    ) {
      rows.push(obj);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") visit(value);
    }
  };

  visit(result);
  return rows;
}

function tryParseJsonBlob(text: string, visit: (node: unknown) => void): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    visit(JSON.parse(trimmed));
  } catch {
    // ignore non-JSON tool text
  }
}

function mapObjectRow(
  row: Record<string, unknown>,
  kind: HubspotObjectKind,
): ComposerRefItem | null {
  const props =
    row.properties && typeof row.properties === "object"
      ? (row.properties as Record<string, unknown>)
      : {};

  const rawId =
    row.id ??
    props.hs_object_id ??
    props.hsObjectId ??
    row.hs_object_id;
  const objectId = String(rawId ?? "").trim();
  if (!objectId || !/^\d+$/.test(objectId)) return null;

  const name = displayNameFor(kind, row, props);
  const url =
    typeof row.url === "string"
      ? row.url
      : typeof row.urlTemplate === "string"
        ? row.urlTemplate.replace("{id}", objectId)
        : undefined;

  const emailOrDomain =
    kind === "contact"
      ? stringProp(props, "email")
      : stringProp(props, "domain") ?? stringProp(props, "website");

  const modifiedAt =
    stringProp(props, "lastmodifieddate") ??
    stringProp(props, "hs_lastmodifieddate") ??
    (typeof row.updatedAt === "string" ? row.updatedAt : undefined);

  const createdAt =
    stringProp(props, "createdate") ??
    (typeof row.createdAt === "string" ? row.createdAt : undefined);

  return {
    id: formatHubspotRefId(kind, objectId),
    name,
    url,
    mimeType: `hubspot/${kind}`,
    modifiedAt,
    createdAt,
    author: emailOrDomain,
  };
}

function displayNameFor(
  kind: HubspotObjectKind,
  row: Record<string, unknown>,
  props: Record<string, unknown>,
): string {
  if (typeof row.displayName === "string" && row.displayName.trim()) {
    return row.displayName.trim();
  }
  if (kind === "contact") {
    const full = stringProp(props, "hs_full_name_or_email");
    if (full) return full;
    const first = stringProp(props, "firstname") ?? "";
    const last = stringProp(props, "lastname") ?? "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return stringProp(props, "email") ?? `Contact`;
  }
  return (
    stringProp(props, "name") ??
    stringProp(props, "domain") ??
    stringProp(props, "website") ??
    "Company"
  );
}

function stringProp(
  props: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = props[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function baseHubspotHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
}

function touchHubspotSession(): void {
  if (hubspotMcpSession) {
    hubspotMcpSession.expiresAt = Date.now() + HUBSPOT_SESSION_TTL_MS;
  }
}

async function ensureHubspotMcpSession(
  token: string,
): Promise<{ headers: Record<string, string>; session: "new" | "reused" }> {
  const headers = baseHubspotHeaders(token);

  if (
    hubspotMcpSession &&
    hubspotMcpSession.token === token &&
    hubspotMcpSession.expiresAt > Date.now()
  ) {
    headers["mcp-session-id"] = hubspotMcpSession.sessionId;
    return { headers, session: "reused" };
  }

  const initRes = await fetch("https://mcp.hubspot.com", {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "agent-c-composer", version: "0.0.0" },
      },
    }),
  });

  const sessionId = initRes.headers.get("mcp-session-id");
  if (sessionId) {
    headers["mcp-session-id"] = sessionId;
    hubspotMcpSession = {
      token,
      sessionId,
      expiresAt: Date.now() + HUBSPOT_SESSION_TTL_MS,
    };
  } else {
    hubspotMcpSession = null;
  }

  if (initRes.ok) {
    await fetch("https://mcp.hubspot.com", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    }).catch(() => {
      // Best-effort
    });
  }

  return { headers, session: "new" };
}

async function callHubspotMcpTool(
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; session: "new" | "reused" }> {
  let { headers, session } = await ensureHubspotMcpSession(token);

  const callOnce = async (hdrs: Record<string, string>, id: number) => {
    return fetch("https://mcp.hubspot.com", {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });
  };

  let callRes = await callOnce(headers, 2);

  if (callRes.status === 404 || callRes.status === 400) {
    hubspotMcpSession = null;
    const fresh = await ensureHubspotMcpSession(token);
    headers = fresh.headers;
    session = "new";
    callRes = await callOnce(headers, 3);
  }

  if (!callRes.ok) {
    const text = await callRes.text().catch(() => "");
    throw new Error(
      `HubSpot MCP error: ${callRes.status} ${callRes.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`,
    );
  }

  const payload = await readMcpResponse(callRes);
  if (payload.error) {
    throw new Error(
      `HubSpot MCP error: ${payload.error.message ?? "unknown"}`,
    );
  }

  touchHubspotSession();
  return { result: payload.result, session };
}

async function readMcpResponse(res: Response): Promise<JsonRpcResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const dataLines = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    const last = dataLines.at(-1);
    if (!last) throw new Error("HubSpot MCP: empty SSE response");
    return JSON.parse(last) as JsonRpcResponse;
  }
  return (await res.json()) as JsonRpcResponse;
}
