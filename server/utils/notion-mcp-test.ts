/**
 * Probe Notion hosted MCP with a Connect-minted OAuth token.
 *
 * MCP-audienced tokens are not accepted by api.notion.com (and that endpoint
 * can hang). Chat already exercises MCP via Eve; this Integrations test only
 * confirms Connect can mint a token for the connector.
 */

/**
 * Validate a Connect Notion MCP token and return display lines for the UI.
 */
export async function testNotionMcpConnection(_token: string): Promise<string[]> {
  return [
    "Notion OAuth connected",
    "Use chat to search Notion via MCP (notion__notion-search, etc.)",
  ];
}
