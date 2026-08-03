/**
 * Notion MCP search for the composer `@` mention picker.
 * Uses Streamable HTTP against mcp.notion.com with a Connect-minted token.
 */

export type NotionRefItem = {
  id: string;
  name: string;
  url?: string;
  mimeType?: string;
  modifiedAt?: string;
  createdAt?: string;
  author?: string;
};

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string };
};

/** Reuse Streamable HTTP sessions across searches (avoids init+notify each call). */
type NotionMcpSession = {
  token: string;
  sessionId: string;
  expiresAt: number;
};

let notionMcpSession: NotionMcpSession | null = null;
/** Idle TTL; successful searches slide this forward so active use stays warm. */
const NOTION_SESSION_TTL_MS = 4 * 60_000;

export type NotionSearchResult = {
  items: NotionRefItem[];
  /** Whether this request had to open a new MCP session. */
  session: "new" | "reused";
};

export type NotionRefDetail = NotionRefItem & {
  bodyMarkdown?: string;
  bodyNote?: string;
};

/**
 * Call Notion hosted MCP `notion-search` and map page hits for the picker.
 * Empty query asks for a broad/recent-friendly workspace search.
 */
export async function searchNotionRefs(
  token: string,
  query: string,
  limit = 12,
): Promise<NotionSearchResult> {
  const q = query.trim() || "page";
  const { result, session } = await callNotionMcpTool(token, "notion-search", {
    query: q,
  });

  return {
    items: parseNotionSearchResult(result, limit),
    session,
  };
}

/**
 * Fetch a Notion page for the composer detail panel via MCP `notion-fetch`.
 */
export async function fetchNotionRefDetail(
  token: string,
  pageId: string,
  fallbackName?: string,
): Promise<NotionRefDetail> {
  const { result } = await callNotionMcpTool(token, "notion-fetch", {
    id: pageId,
  });

  const text = extractMcpText(result);
  const metaFromSearch = parseNotionSearchResult(result, 1)[0];

  return {
    id: pageId,
    name: metaFromSearch?.name || fallbackName || "Untitled",
    url: metaFromSearch?.url ?? guessNotionUrl(pageId),
    mimeType: "notion/page",
    modifiedAt: metaFromSearch?.modifiedAt,
    createdAt: metaFromSearch?.createdAt,
    author: metaFromSearch?.author,
    bodyMarkdown: text || undefined,
    bodyNote: text
      ? undefined
      : "Opened the page, but no readable preview was returned. Use Open in Notion.",
  };
}

function guessNotionUrl(pageId: string): string | undefined {
  const compact = pageId.replace(/-/g, "");
  if (!compact) return undefined;
  return `https://www.notion.so/${compact}`;
}

function extractMcpText(result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const obj = result as Record<string, unknown>;
  const parts: string[] = [];

  if (Array.isArray(obj.content)) {
    for (const part of obj.content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "text" &&
        typeof (part as { text?: string }).text === "string"
      ) {
        parts.push((part as { text: string }).text);
      }
    }
  }

  if (typeof obj.markdown === "string") parts.push(obj.markdown);
  if (typeof obj.text === "string") parts.push(obj.text);

  return parts.join("\n\n").trim();
}

function baseNotionHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
}

function touchNotionSession(): void {
  if (notionMcpSession) {
    notionMcpSession.expiresAt = Date.now() + NOTION_SESSION_TTL_MS;
  }
}

async function ensureNotionMcpSession(
  token: string,
): Promise<{ headers: Record<string, string>; session: "new" | "reused" }> {
  const headers = baseNotionHeaders(token);

  if (
    notionMcpSession &&
    notionMcpSession.token === token &&
    notionMcpSession.expiresAt > Date.now()
  ) {
    headers["mcp-session-id"] = notionMcpSession.sessionId;
    return { headers, session: "reused" };
  }

  const initRes = await fetch("https://mcp.notion.com/mcp", {
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
    notionMcpSession = {
      token,
      sessionId,
      expiresAt: Date.now() + NOTION_SESSION_TTL_MS,
    };
  } else {
    notionMcpSession = null;
  }

  if (initRes.ok) {
    await fetch("https://mcp.notion.com/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    }).catch(() => {
      // Best-effort; some transports ignore this.
    });
  }

  return { headers, session: "new" };
}

async function callNotionMcpTool(
  token: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; session: "new" | "reused" }> {
  let { headers, session } = await ensureNotionMcpSession(token);

  const callOnce = async (hdrs: Record<string, string>, id: number) => {
    const callRes = await fetch("https://mcp.notion.com/mcp", {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params: {
          name,
          arguments: args,
        },
      }),
    });
    return callRes;
  };

  let callRes = await callOnce(headers, 2);

  // Session expired / unknown — clear cache and retry once with a fresh session.
  if (callRes.status === 404 || callRes.status === 400) {
    notionMcpSession = null;
    const fresh = await ensureNotionMcpSession(token);
    headers = fresh.headers;
    session = "new";
    callRes = await callOnce(headers, 3);
  }

  if (!callRes.ok) {
    const text = await callRes.text().catch(() => "");
    throw new Error(
      `Notion MCP error: ${callRes.status} ${callRes.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`,
    );
  }

  const payload = await readMcpResponse(callRes);
  if (payload.error) {
    throw new Error(
      `Notion MCP error: ${payload.error.message ?? "unknown"}`,
    );
  }

  touchNotionSession();
  return { result: payload.result, session };
}

async function readMcpResponse(res: Response): Promise<JsonRpcResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    // Take the last JSON data line from the SSE stream.
    const dataLines = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    const last = dataLines.at(-1);
    if (!last) throw new Error("Notion MCP: empty SSE response");
    return JSON.parse(last) as JsonRpcResponse;
  }
  return (await res.json()) as JsonRpcResponse;
}

function parseNotionSearchResult(
  result: unknown,
  limit: number,
): NotionRefItem[] {
  const items: NotionRefItem[] = [];
  const seen = new Set<string>();

  const push = (raw: Record<string, unknown>) => {
    const id = String(
      raw.id ?? raw.page_id ?? raw.pageId ?? raw.url ?? "",
    ).trim();
    if (!id || seen.has(id)) return;

    const name = String(
      raw.title ??
        raw.name ??
        raw.page_title ??
        extractTitleFromText(raw) ??
        "Untitled",
    ).trim();

    const url =
      typeof raw.url === "string"
        ? raw.url
        : typeof raw.page_url === "string"
          ? raw.page_url
          : undefined;

    // Prefer pages; skip obvious databases/users when typed.
    const objectType = String(raw.object ?? raw.type ?? "").toLowerCase();
    if (
      objectType &&
      !objectType.includes("page") &&
      (objectType.includes("database") ||
        objectType.includes("user") ||
        objectType.includes("data_source"))
    ) {
      return;
    }

    seen.add(id);
    const author = extractPersonName(
      raw.last_edited_by ?? raw.created_by ?? raw.author ?? raw.createdBy,
    );
    items.push({
      id,
      name: name || "Untitled",
      url,
      mimeType: "notion/page",
      modifiedAt:
        typeof raw.last_edited_time === "string"
          ? raw.last_edited_time
          : typeof raw.updatedAt === "string"
            ? raw.updatedAt
            : typeof raw.lastEditedTime === "string"
              ? raw.lastEditedTime
              : undefined,
      createdAt:
        typeof raw.created_time === "string"
          ? raw.created_time
          : typeof raw.createdAt === "string"
            ? raw.createdAt
            : undefined,
      author,
    });
  };

  const visit = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    // MCP tool results often wrap text content.
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
          push(entry as Record<string, unknown>);
        }
      }
    }

    if (obj.id || obj.page_id || obj.pageId) {
      push(obj);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") visit(value);
    }
  };

  visit(result);
  return items.slice(0, limit);
}

function tryParseJsonBlob(
  text: string,
  visit: (node: unknown) => void,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    visit(JSON.parse(trimmed));
  } catch {
    // Not JSON — ignore; structured results may still appear elsewhere.
  }
}

function extractTitleFromText(raw: Record<string, unknown>): string | null {
  if (typeof raw.text === "string" && raw.text.trim()) {
    return raw.text.trim().slice(0, 120);
  }
  return null;
}

function extractPersonName(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  if (typeof obj.name === "string" && obj.name.trim()) return obj.name.trim();
  if (obj.person && typeof obj.person === "object") {
    const person = obj.person as Record<string, unknown>;
    if (typeof person.email === "string" && person.email.trim()) {
      return person.email.trim();
    }
  }
  if (typeof obj.email === "string" && obj.email.trim()) return obj.email.trim();
  return undefined;
}
