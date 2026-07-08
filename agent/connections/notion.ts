import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { NOTION_CONNECTOR } from "../../shared/connect.js";

/**
 * Notion hosted MCP — OAuth only (no bearer/integration token on this endpoint).
 * @see https://developers.notion.com/guides/mcp/get-started-with-mcp
 *
 * Block write tools for v1; leave read/search tools discoverable via
 * `connection_search` (hosted Notion tool names can evolve).
 */
export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace: search and read pages and databases the signed-in user can access. Use for internal docs, specs, and case-study notes.",
  auth: connect(NOTION_CONNECTOR),
  tools: {
    block: [
      "notion-create-pages",
      "notion-update-page",
      "notion-create-database",
      "notion-update-data-source",
      "notion-create-comment",
      "notion-move-pages",
      "notion-duplicate-page",
      "notion-create-view",
      "notion-update-view",
    ],
  },
});
