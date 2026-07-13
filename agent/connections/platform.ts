import { defineMcpClientConnection } from "eve/connections";

/**
 * CodeBase Platform MCP — mentorship, programmes, companies, users (read-only).
 * App-scoped shared bearer (`PLATFORM_MCP_TOKEN`) against `PLATFORM_MCP_URL`.
 *
 * Write tools are intentionally omitted for internal release. Re-enable on
 * Platform with PLATFORM_MCP_WRITES_ENABLED and re-add to `tools.allow` later.
 */
export default defineMcpClientConnection({
  url:
    process.env.PLATFORM_MCP_URL?.trim()
    || "http://localhost:3000/api/mcp",
  description:
    "CodeBase Platform (read-only): search mentorship sessions, mentors, companies, programmes, signups, credits, and workspace users. Prefer this for live programme/ops data. Results include absolute `url` permalinks when Platform is configured — cite those; never invent links.",
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
    ],
  },
});
