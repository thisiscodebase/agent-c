/**
 * Tally MCP list/resolve for composer `@` mentions and paste-to-chip.
 * Uses Streamable HTTP against api.tally.so/mcp with a Connect-minted token.
 */

import type { ComposerRefItem } from "#shared/composer-refs";
import { parseTallyUrl, tallyFallbackName } from "#shared/tally-url";

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string };
};

type TallyMcpSession = {
  token: string;
  sessionId: string;
  expiresAt: number;
};

let tallyMcpSession: TallyMcpSession | null = null;
const TALLY_SESSION_TTL_MS = 4 * 60_000;
const TALLY_MCP_URL = "https://api.tally.so/mcp";

export type TallySearchResult = {
  items: ComposerRefItem[];
  session: "new" | "reused";
};

export type TallyRefDetail = ComposerRefItem & {
  bodyMarkdown?: string;
  bodyNote?: string;
};

/**
 * List / filter Tally forms for the `@` picker.
 * Empty query → first page of forms; otherwise name substring filter.
 */
export async function searchTallyRefs(
  token: string,
  query: string,
  limit = 12,
): Promise<TallySearchResult> {
  const q = query.trim().toLowerCase();
  const { forms, session } = await listFormsPages(token, q ? 3 : 1, 50);

  let items = forms.map(mapFormRow).filter((item): item is ComposerRefItem => Boolean(item));
  if (q) {
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }

  items.sort((a, b) => {
    const am = a.modifiedAt ? Date.parse(a.modifiedAt) : 0;
    const bm = b.modifiedAt ? Date.parse(b.modifiedAt) : 0;
    return bm - am;
  });

  return { items: items.slice(0, limit), session };
}

export async function fetchTallyRefDetail(
  token: string,
  formId: string,
  fallbackName?: string,
): Promise<TallyRefDetail> {
  const fallback: TallyRefDetail = {
    id: formId,
    name: fallbackName || tallyFallbackName(formId),
    url: `https://tally.so/r/${formId}`,
    mimeType: "tally/form",
    bodyNote:
      "Couldn’t load a live Tally preview. The form id is still valid for chat.",
  };

  try {
    const form = await findFormById(token, formId);
    if (!form) {
      return {
        ...fallback,
        bodyNote: "Form not found in your Tally workspaces (or you may lack access).",
      };
    }
    const item = mapFormRow(form);
    if (!item) return fallback;
    return {
      ...item,
      bodyMarkdown: formatTallyPreview(item, form),
    };
  } catch {
    return fallback;
  }
}

export async function resolveTallyUrl(
  token: string,
  rawUrl: string,
): Promise<ComposerRefItem> {
  const parsed = parseTallyUrl(rawUrl);
  if (!parsed) {
    throw new Error("Not a Tally form URL");
  }

  const detail = await fetchTallyRefDetail(token, parsed.formId);
  return {
    id: detail.id,
    name: detail.name,
    url: detail.url ?? parsed.url,
    mimeType: detail.mimeType,
    modifiedAt: detail.modifiedAt,
    createdAt: detail.createdAt,
    author: detail.author,
  };
}

async function findFormById(
  token: string,
  formId: string,
): Promise<Record<string, unknown> | null> {
  const { forms } = await listFormsPages(token, 5, 50);
  const needle = formId.toLowerCase();
  return (
    forms.find((form) => String(form.id ?? "").toLowerCase() === needle) ?? null
  );
}

async function listFormsPages(
  token: string,
  maxPages: number,
  limit: number,
): Promise<{ forms: Record<string, unknown>[]; session: "new" | "reused" }> {
  const forms: Record<string, unknown>[] = [];
  let session: "new" | "reused" = "reused";

  for (let page = 1; page <= maxPages; page++) {
    const { result, session: pageSession } = await callTallyMcpTool(
      token,
      "list_forms",
      { page, limit },
    );
    if (page === 1) session = pageSession;

    const pageForms = extractForms(result);
    forms.push(...pageForms);

    const hasMore = extractHasMore(result);
    if (!hasMore || pageForms.length === 0) break;
  }

  return { forms, session };
}

function formatTallyPreview(
  item: ComposerRefItem,
  raw: Record<string, unknown>,
): string {
  const lines = [`**Tally form** · ${item.name}`];
  if (typeof raw.status === "string") lines.push(`Status: ${raw.status}`);
  if (typeof raw.numberOfSubmissions === "number") {
    lines.push(`Submissions: ${raw.numberOfSubmissions}`);
  }
  if (item.url) lines.push(`[Open in Tally](${item.url})`);
  lines.push(
    "",
    `_Composer reference \`${item.id}\`. Ask Agent C to fetch submissions if needed._`,
  );
  return lines.join("\n");
}

function mapFormRow(row: Record<string, unknown>): ComposerRefItem | null {
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  const name =
    (typeof row.name === "string" && row.name.trim()) || tallyFallbackName(id);
  return {
    id,
    name,
    url: `https://tally.so/r/${id}`,
    mimeType: "tally/form",
    modifiedAt:
      typeof row.updatedAt === "string"
        ? row.updatedAt
        : typeof row.updated_at === "string"
          ? row.updated_at
          : undefined,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : typeof row.created_at === "string"
          ? row.created_at
          : undefined,
    author:
      typeof row.status === "string" ? row.status : undefined,
  };
}

function extractHasMore(result: unknown): boolean {
  const rows = extractObjectRows(result);
  for (const row of rows) {
    if (typeof row.hasMore === "boolean") return row.hasMore;
    if (row.data && typeof row.data === "object") {
      const data = row.data as Record<string, unknown>;
      if (typeof data.hasMore === "boolean") return data.hasMore;
    }
  }
  return false;
}

function extractForms(result: unknown): Record<string, unknown>[] {
  const forms: Record<string, unknown>[] = [];
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

    if (Array.isArray(obj.forms)) {
      for (const entry of obj.forms) {
        if (entry && typeof entry === "object") {
          forms.push(entry as Record<string, unknown>);
        }
      }
    }

    if (Array.isArray(obj.items)) {
      for (const entry of obj.items) {
        if (entry && typeof entry === "object" && "id" in (entry as object)) {
          forms.push(entry as Record<string, unknown>);
        }
      }
    }

    if (obj.data && typeof obj.data === "object") {
      visit(obj.data);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") visit(value);
    }
  };

  visit(result);
  return forms;
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
    rows.push(obj);
    if (Array.isArray(obj.content)) {
      for (const part of obj.content) {
        if (
          part &&
          typeof part === "object" &&
          (part as { type?: string }).type === "text" &&
          typeof (part as { text?: string }).text === "string"
        ) {
          tryParseJsonBlob((part as { text: string }).text, visit);
        }
      }
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
    // ignore
  }
}

function baseTallyHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
}

function touchTallySession(): void {
  if (tallyMcpSession) {
    tallyMcpSession.expiresAt = Date.now() + TALLY_SESSION_TTL_MS;
  }
}

async function ensureTallyMcpSession(
  token: string,
): Promise<{ headers: Record<string, string>; session: "new" | "reused" }> {
  const headers = baseTallyHeaders(token);

  if (
    tallyMcpSession &&
    tallyMcpSession.token === token &&
    tallyMcpSession.expiresAt > Date.now()
  ) {
    headers["mcp-session-id"] = tallyMcpSession.sessionId;
    return { headers, session: "reused" };
  }

  const initRes = await fetch(TALLY_MCP_URL, {
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
    tallyMcpSession = {
      token,
      sessionId,
      expiresAt: Date.now() + TALLY_SESSION_TTL_MS,
    };
  } else {
    tallyMcpSession = null;
  }

  if (initRes.ok) {
    await fetch(TALLY_MCP_URL, {
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

async function callTallyMcpTool(
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; session: "new" | "reused" }> {
  let { headers, session } = await ensureTallyMcpSession(token);

  const callOnce = async (hdrs: Record<string, string>, id: number) => {
    return fetch(TALLY_MCP_URL, {
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
    tallyMcpSession = null;
    const fresh = await ensureTallyMcpSession(token);
    headers = fresh.headers;
    session = "new";
    callRes = await callOnce(headers, 3);
  }

  if (!callRes.ok) {
    const text = await callRes.text().catch(() => "");
    throw new Error(
      `Tally MCP error: ${callRes.status} ${callRes.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`,
    );
  }

  const payload = await readMcpResponse(callRes);
  if (payload.error) {
    throw new Error(`Tally MCP error: ${payload.error.message ?? "unknown"}`);
  }

  touchTallySession();
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
    if (!last) throw new Error("Tally MCP: empty SSE response");
    return JSON.parse(last) as JsonRpcResponse;
  }
  return (await res.json()) as JsonRpcResponse;
}
