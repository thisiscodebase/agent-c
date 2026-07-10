import type { ConnectorDef } from "#shared/types/connector";
import {
  DRIVE_CONNECTOR,
  HUBSPOT_CONNECTOR,
  HUBSPOT_OAUTH_SCOPES,
  NOTION_CONNECTOR,
  PLATFORM_CONNECTOR,
  SLACK_CONNECTOR,
  TALLY_CONNECTOR,
} from "#shared/connect";
import { createError } from "~~/server/utils/http-error";
import { testNotionMcpConnection } from "~~/server/utils/notion-mcp-test";
import { testPlatformMcpConnection } from "~~/server/utils/platform-mcp-test";

export const connectors: ConnectorDef[] = [
  {
    id: "drive",
    name: "Google Drive",
    description: "Search and read Drive files you can access (case-study source material).",
    connector: DRIVE_CONNECTOR,
    connectionName: "drive",
    icon: "i-simple-icons-googledrive",
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    test: {
      label: "List recent files",
      run: async (token) => {
        const res = await fetch(
          "https://www.googleapis.com/drive/v3/files?pageSize=5&fields=files(id,name)&orderBy=modifiedTime desc",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error(`Drive API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as { files?: Array<{ name: string }> };
        return (data.files ?? []).map((file) => file.name);
      },
    },
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM companies, deals, and contacts for case-study lookup.",
    connector: HUBSPOT_CONNECTOR,
    connectionName: "hubspot",
    icon: "i-simple-icons-hubspot",
    scopes: [...HUBSPOT_OAUTH_SCOPES],
    // HubSpot MCP Auth Apps also show an object-permission picker at install.
    // User-scoped — HubSpot MCP requires OAuth 2.1 + PKCE per installing user.
    authMode: "user",
    test: {
      label: "Check connection",
      run: async (token) => {
        // MCP Auth App tokens are for mcp.hubspot.com, not the CRM REST API.
        // Validate via OAuth token metadata when HubSpot exposes it.
        const res = await fetch(
          `https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(token)}`,
        );

        if (res.ok) {
          const data = await res.json() as {
            user?: string;
            hub_domain?: string;
            scopes?: string[];
          };

          const hub = data.hub_domain ?? "HubSpot portal";
          const user = data.user ?? "connected user";
          const scopes = data.scopes ?? [];
          const missingCrm = HUBSPOT_OAUTH_SCOPES.filter((scope) => !scopes.includes(scope));

          const lines = [
            `${hub} — ${user}`,
            scopes.length ? `Scopes: ${scopes.join(", ")}` : "MCP scopes active",
          ];

          if (missingCrm.length > 0) {
            lines.push(
              `Missing CRM scopes (${missingCrm.join(", ")}). Revoke HubSpot here, then reconnect and approve object permissions on the HubSpot consent screen.`,
            );
          }

          return lines;
        }

        // Connect minted a token (probe passed) but metadata/CRM APIs may not
        // accept MCP-scoped tokens — still a successful connection for chat tools.
        return [
          "HubSpot OAuth connected",
          "Use chat to query CRM via MCP (hubspot__search_crm_objects, etc.)",
        ];
      },
    },
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search and read Notion pages and databases you can access.",
    connector: NOTION_CONNECTOR,
    connectionName: "notion",
    icon: "i-simple-icons-notion",
    // Notion hosted MCP uses OAuth; scopes come from the MCP Auth metadata.
    scopes: [],
    test: {
      // Connect mints MCP-audienced tokens; chat exercises MCP via Eve.
      // Do not call api.notion.com — those tokens hang there and 502.
      label: "Check connection",
      run: async (token) => testNotionMcpConnection(token),
    },
  },
  {
    id: "tally",
    name: "Tally",
    description: "List forms and fetch submission data from your Tally workspace.",
    connector: TALLY_CONNECTOR,
    connectionName: "tally",
    icon: "i-simple-icons-tally",
    // Tally MCP OAuth scopes come from protected-resource metadata (`mcp`, etc.).
    scopes: [],
    test: {
      label: "Check connection",
      run: async () => [
        "Tally OAuth connected",
        "Use chat to list forms and submissions via MCP (tally__… tools)",
      ],
    },
  },
  {
    id: "platform",
    name: "CodeBase Platform",
    description:
      "Mentorship sessions, companies, programmes, mentors, and workspace users (shared service token).",
    connector: PLATFORM_CONNECTOR,
    connectionName: "platform",
    icon: "i-lucide-building-2",
    scopes: [],
    authMode: "env",
    staticTokenEnv: "PLATFORM_MCP_TOKEN",
    mcpUrlEnv: "PLATFORM_MCP_URL",
    test: {
      label: "Check MCP",
      run: async (token) => testPlatformMcpConnection(token),
    },
  },
  {
    id: "slack",
    name: "Slack search",
    description:
      "Search Slack messages and files with your permissions (same app as the Slack channel).",
    connector: SLACK_CONNECTOR,
    connectionName: "search_slack",
    icon: "i-simple-icons-slack",
    scopes: [
      "search:read.public",
      "search:read.private",
      "search:read.files",
      "search:read.users",
    ],
    test: {
      label: "Search recent messages",
      run: async (token) => {
        const res = await fetch("https://slack.com/api/assistant.search.context", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            query: "case study",
            channel_types: ["public_channel", "private_channel"],
            content_types: ["messages"],
            limit: 5,
          }),
        });

        if (!res.ok) {
          throw new Error(`Slack API error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json() as {
          ok: boolean;
          error?: string;
          results?: {
            messages?: Array<{ content?: string; channel_name?: string }>;
          };
        };

        if (!data.ok) {
          throw new Error(`Slack search failed: ${data.error ?? "unknown_error"}`);
        }

        return (data.results?.messages ?? []).map((message) => {
          const preview = (message.content ?? "").slice(0, 80);
          const channel = message.channel_name ? `#${message.channel_name}` : "message";
          return preview ? `${channel} — ${preview}` : channel;
        });
      },
    },
  },
];

export function getConnector(id: string): ConnectorDef {
  const connector = connectors.find((entry) => entry.id === id);

  if (!connector) {
    throw createError({
      statusCode: 404,
      statusMessage: "Connector not found",
    });
  }

  return connector;
}
