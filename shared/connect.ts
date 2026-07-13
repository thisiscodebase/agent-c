/**
 * Issuer passed to Vercel Connect for user-scoped tokens.
 * Must match Eve's `appSession()` authenticator in `agent/channels/eve.ts`.
 */
export const CONNECT_USER_ISSUER = "app";

/**
 * Vercel Connect connector UIDs — keep in sync with `server/connectors.ts`
 * and `agent/connections/*.ts`. Update after `vercel connect create` /
 * `vercel connect list` if the provisioned UID differs.
 */
export const DRIVE_CONNECTOR = "oauth/drive-codebase-agent";
export const HUBSPOT_CONNECTOR = "mcp.hubspot.com/agent-c";
/**
 * CRM read scopes requested on Connect + in-chat OAuth. HubSpot MCP also
 * shows an object-permission picker during install — users must approve
 * contacts/companies/deals there. After changing this list, revoke and
 * reconnect HubSpot in Settings → Integrations.
 */
export const HUBSPOT_OAUTH_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
  "crm.objects.users.read",
  "crm.objects.tickets.read",
] as const;
export const NOTION_CONNECTOR = "mcp.notion.com/agent-c";
/** Tally hosted MCP (`https://api.tally.so/mcp`). Update after `vercel connect list` if needed. */
export const TALLY_CONNECTOR = "api.tally.so/agent-c";
/** Same Connect app as the Slack channel (`agent/channels/slack.ts`). */
export const SLACK_CONNECTOR = "slack/agent-c";

/**
 * CodeBase Platform MCP — app-scoped shared bearer (not Vercel Connect).
 * Set `PLATFORM_MCP_URL` + `PLATFORM_MCP_TOKEN` on the Eve runtime.
 * Sentinel UID for the Integrations registry only.
 */
export const PLATFORM_CONNECTOR = "platform-mcp/env";
