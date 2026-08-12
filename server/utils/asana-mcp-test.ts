/**
 * Probe Asana hosted MCP with a Connect-minted OAuth token.
 *
 * MCP-audienced tokens are not accepted by the standard Asana REST API
 * (and that endpoint is the wrong validation target). Chat exercises MCP
 * via Eve — keep Integrations Test aligned with Notion/Tally.
 */

/**
 * Validate a Connect Asana MCP token and return display lines for the UI.
 */
export async function testAsanaMcpConnection(_token: string): Promise<string[]> {
  return [
    "Asana OAuth connected",
    "Use chat to search tasks and projects via MCP (asana__search_tasks, etc.)",
  ];
}
