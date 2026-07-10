/**
 * Probe CodeBase Platform MCP with the shared env bearer.
 */

export async function testPlatformMcpConnection(token: string): Promise<string[]> {
  const url = process.env.PLATFORM_MCP_URL?.trim();
  if (!url) {
    throw new Error("PLATFORM_MCP_URL is not set");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "agent-c-integrations-test", version: "1.0.0" },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Platform MCP error: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }

  return [
    "Platform MCP reachable",
    "Use chat for companies, sessions, programmes (platform__… tools)",
  ];
}
