/**
 * Asana MCP search / fetch for composer `@` mentions and paste-to-chip.
 * Uses Streamable HTTP against mcp.asana.com with a Connect-minted token.
 */

import type { ComposerRefItem } from "#shared/composer-refs";
import {
  asanaFallbackName,
  asanaKindLabel,
  formatAsanaRefId,
  parseAsanaRefId,
  parseAsanaUrl,
  type AsanaObjectKind,
} from "#shared/asana-url";

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string };
};

type AsanaMcpSession = {
  token: string;
  sessionId: string;
  expiresAt: number;
};

let asanaMcpSession: AsanaMcpSession | null = null;
const ASANA_SESSION_TTL_MS = 4 * 60_000;
const ASANA_MCP_URL = "https://mcp.asana.com/v2/mcp";

export type AsanaSearchResult = {
  items: ComposerRefItem[];
  session: "new" | "reused";
};

export type AsanaRefDetail = ComposerRefItem & {
  bodyMarkdown?: string;
  bodyNote?: string;
};

/**
 * Search / list Asana tasks for the `@` picker.
 * Empty query → current user's incomplete tasks; otherwise full-text search.
 */
export async function searchAsanaRefs(
  token: string,
  query: string,
  limit = 12,
): Promise<AsanaSearchResult> {
  const q = query.trim();

  if (!q) {
    const { result, session } = await callAsanaMcpTool(token, "get_my_tasks", {
      completed_since: "now",
      limit,
      opt_fields: "name,permalink_url,assignee.name,modified_at,completed",
    });
    return {
      items: parseTaskList(result, limit),
      session,
    };
  }

  try {
    const { result, session } = await callAsanaMcpTool(token, "search_tasks", {
      text: q,
      limit,
      sort_by: "modified_at",
      opt_fields: "name,permalink_url,assignee.name,modified_at,completed",
    });
    return {
      items: parseTaskList(result, limit),
      session,
    };
  } catch {
    // Non-premium workspaces may lack search_tasks — fall back to my tasks.
    const { result, session } = await callAsanaMcpTool(token, "get_my_tasks", {
      completed_since: "now",
      limit: Math.max(limit, 40),
      opt_fields: "name,permalink_url,assignee.name,modified_at,completed",
    });
    const needle = q.toLowerCase();
    const items = parseTaskList(result, 40).filter((item) =>
      item.name.toLowerCase().includes(needle),
    );
    return { items: items.slice(0, limit), session };
  }
}

export async function fetchAsanaRefDetail(
  token: string,
  refId: string,
  fallbackName?: string,
): Promise<AsanaRefDetail> {
  const parsed = parseAsanaRefId(refId);
  if (!parsed) {
    throw new Error("Invalid Asana ref id (expected task:GID or project:GID)");
  }

  const fallback: AsanaRefDetail = {
    id: formatAsanaRefId(parsed.kind, parsed.objectId),
    name:
      fallbackName || asanaFallbackName(parsed.kind, parsed.objectId),
    mimeType: `asana/${parsed.kind}`,
    url: guessAsanaUrl(parsed.kind, parsed.objectId),
    bodyNote:
      "Couldn’t load a live Asana preview. The reference id is still valid for chat.",
  };

  try {
    if (parsed.kind === "task") {
      const { result } = await callAsanaMcpTool(token, "get_task", {
        task_id: parsed.objectId,
        include_comments: false,
        include_subtasks: false,
        opt_fields:
          "name,permalink_url,assignee.name,modified_at,created_at,notes,completed",
      });
      const item = mapTaskRow(extractFirstRecord(result));
      if (!item) return fallback;
      const notes = extractNotes(result);
      return {
        ...item,
        bodyMarkdown: formatAsanaPreview("task", item, notes),
      };
    }

    const { result } = await callAsanaMcpTool(token, "get_project", {
      project_id: parsed.objectId,
      include_sections: false,
      opt_fields: "name,permalink_url,owner.name,modified_at,created_at,notes",
    });
    const item = mapProjectRow(extractFirstRecord(result));
    if (!item) return fallback;
    const notes = extractNotes(result);
    return {
      ...item,
      bodyMarkdown: formatAsanaPreview("project", item, notes),
    };
  } catch {
    return fallback;
  }
}

export async function resolveAsanaUrl(
  token: string,
  rawUrl: string,
): Promise<ComposerRefItem> {
  const parsed = parseAsanaUrl(rawUrl);
  if (!parsed) {
    throw new Error("Not an Asana task or project URL");
  }

  const detail = await fetchAsanaRefDetail(
    token,
    formatAsanaRefId(parsed.kind, parsed.objectId),
  );
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

function guessAsanaUrl(kind: AsanaObjectKind, objectId: string): string {
  if (kind === "project") {
    return `https://app.asana.com/0/${objectId}/${objectId}`;
  }
  return `https://app.asana.com/0/0/${objectId}`;
}

function formatAsanaPreview(
  kind: AsanaObjectKind,
  item: ComposerRefItem,
  notes?: string,
): string {
  const lines = [`**${asanaKindLabel(kind)}** · ${item.name}`];
  if (item.author) lines.push(`Assignee / owner: ${item.author}`);
  if (item.url) lines.push(`[Open in Asana](${item.url})`);
  if (notes?.trim()) {
    lines.push("", notes.trim());
  } else {
    lines.push(
      "",
      `_Composer reference \`${item.id}\`. Ask Agent C for fuller Asana context._`,
    );
  }
  return lines.join("\n");
}

function parseTaskList(result: unknown, limit: number): ComposerRefItem[] {
  const rows = extractObjectRows(result);
  const items: ComposerRefItem[] = [];
  for (const row of rows) {
    const item = mapTaskRow(row);
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

function extractFirstRecord(
  result: unknown,
): Record<string, unknown> | null {
  const rows = extractObjectRows(result);
  return rows[0] ?? null;
}

function extractNotes(result: unknown): string | undefined {
  const row = extractFirstRecord(result);
  if (!row) return undefined;
  if (typeof row.notes === "string" && row.notes.trim()) return row.notes;
  const data = row.data;
  if (data && typeof data === "object") {
    const notes = (data as { notes?: unknown }).notes;
    if (typeof notes === "string" && notes.trim()) return notes;
  }
  return undefined;
}

function mapTaskRow(row: Record<string, unknown> | null): ComposerRefItem | null {
  if (!row) return null;
  const gid = String(row.gid ?? row.id ?? "").trim();
  if (!gid || !/^\d+$/.test(gid)) return null;
  const name =
    (typeof row.name === "string" && row.name.trim()) ||
    asanaFallbackName("task", gid);
  const assignee =
    row.assignee && typeof row.assignee === "object"
      ? (row.assignee as { name?: string }).name
      : undefined;
  return {
    id: formatAsanaRefId("task", gid),
    name,
    url:
      typeof row.permalink_url === "string"
        ? row.permalink_url
        : guessAsanaUrl("task", gid),
    mimeType: "asana/task",
    modifiedAt:
      typeof row.modified_at === "string" ? row.modified_at : undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    author: typeof assignee === "string" ? assignee : undefined,
  };
}

function mapProjectRow(
  row: Record<string, unknown> | null,
): ComposerRefItem | null {
  if (!row) return null;
  const gid = String(row.gid ?? row.id ?? "").trim();
  if (!gid || !/^\d+$/.test(gid)) return null;
  const name =
    (typeof row.name === "string" && row.name.trim()) ||
    asanaFallbackName("project", gid);
  const owner =
    row.owner && typeof row.owner === "object"
      ? (row.owner as { name?: string }).name
      : undefined;
  return {
    id: formatAsanaRefId("project", gid),
    name,
    url:
      typeof row.permalink_url === "string"
        ? row.permalink_url
        : guessAsanaUrl("project", gid),
    mimeType: "asana/project",
    modifiedAt:
      typeof row.modified_at === "string" ? row.modified_at : undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    author: typeof owner === "string" ? owner : undefined,
  };
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

    if (Array.isArray(obj.data)) {
      for (const entry of obj.data) {
        if (entry && typeof entry === "object") {
          rows.push(entry as Record<string, unknown>);
        }
      }
    } else if (obj.data && typeof obj.data === "object") {
      rows.push(obj.data as Record<string, unknown>);
    }

    if (obj.gid != null || obj.id != null) {
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
    // ignore
  }
}

function baseAsanaHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
}

function touchAsanaSession(): void {
  if (asanaMcpSession) {
    asanaMcpSession.expiresAt = Date.now() + ASANA_SESSION_TTL_MS;
  }
}

async function ensureAsanaMcpSession(
  token: string,
): Promise<{ headers: Record<string, string>; session: "new" | "reused" }> {
  const headers = baseAsanaHeaders(token);

  if (
    asanaMcpSession &&
    asanaMcpSession.token === token &&
    asanaMcpSession.expiresAt > Date.now()
  ) {
    headers["mcp-session-id"] = asanaMcpSession.sessionId;
    return { headers, session: "reused" };
  }

  const initRes = await fetch(ASANA_MCP_URL, {
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
    asanaMcpSession = {
      token,
      sessionId,
      expiresAt: Date.now() + ASANA_SESSION_TTL_MS,
    };
  } else {
    asanaMcpSession = null;
  }

  if (initRes.ok) {
    await fetch(ASANA_MCP_URL, {
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

async function callAsanaMcpTool(
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; session: "new" | "reused" }> {
  let { headers, session } = await ensureAsanaMcpSession(token);

  const callOnce = async (hdrs: Record<string, string>, id: number) => {
    return fetch(ASANA_MCP_URL, {
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
    asanaMcpSession = null;
    const fresh = await ensureAsanaMcpSession(token);
    headers = fresh.headers;
    session = "new";
    callRes = await callOnce(headers, 3);
  }

  if (!callRes.ok) {
    const text = await callRes.text().catch(() => "");
    throw new Error(
      `Asana MCP error: ${callRes.status} ${callRes.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`,
    );
  }

  const payload = await readMcpResponse(callRes);
  if (payload.error) {
    throw new Error(`Asana MCP error: ${payload.error.message ?? "unknown"}`);
  }

  touchAsanaSession();
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
    if (!last) throw new Error("Asana MCP: empty SSE response");
    return JSON.parse(last) as JsonRpcResponse;
  }
  return (await res.json()) as JsonRpcResponse;
}
