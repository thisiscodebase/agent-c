import { defineMcpClientConnection } from "eve/connections";

const WRITE_TOOLS = [
  "book_session",
  "cancel_session",
  "reschedule_session",
  "grant_credits",
  "create_pairing",
  "update_pairing",
] as const;

/**
 * CodeBase Platform MCP — mentorship, programmes, companies, users.
 * App-scoped shared bearer (`PLATFORM_MCP_TOKEN`) against `PLATFORM_MCP_URL`.
 *
 * Write tools also require `PLATFORM_MCP_WRITES_ENABLED=1` on Platform and
 * human approval in chat (first use per session).
 */
export default defineMcpClientConnection({
  url:
    process.env.PLATFORM_MCP_URL?.trim()
    || "http://localhost:3000/api/mcp",
  description:
    "CodeBase Platform: search and manage mentorship sessions, mentors, companies, programmes, signups, credits, and workspace users. Prefer this for live programme/ops data over guessing.",
  auth: {
    getToken: async () => {
      const token = process.env.PLATFORM_MCP_TOKEN?.trim();
      if (!token) {
        throw new Error("PLATFORM_MCP_TOKEN is not configured");
      }
      return { token };
    },
  },
  tools: {
    allow: [
      "search_companies",
      "get_company",
      "search_sessions",
      "get_session",
      "list_slots",
      "search_mentors",
      "get_pairing",
      "list_credits",
      "search_programmes",
      "list_signups",
      "search_users",
      ...WRITE_TOOLS,
    ],
  },
  approval: ({ toolName }) => {
    if (WRITE_TOOLS.some((name) => toolName.endsWith(`__${name}`) || toolName === name)) {
      return "user-approval";
    }
    return "not-applicable";
  },
});
