import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";
import { ASANA_CONNECTOR } from "../../shared/connect.js";

/**
 * Asana hosted MCP V2 — OAuth only (no dynamic client registration).
 * @see https://developers.asana.com/docs/using-asanas-mcp-server
 * @see https://developers.asana.com/docs/integrating-with-asanas-mcp-server
 *
 * Block write / preview-confirm tools for v1; leave read/search tools
 * discoverable via `connection_search` (hosted tool names can evolve).
 */
export default defineMcpClientConnection({
  url: "https://mcp.asana.com/v2/mcp",
  description:
    "Asana work graph: search and read tasks, projects, portfolios, teams, and status the signed-in user can access. Use for task lists, project status, assignees, and delivery tracking — not as a default people directory.",
  auth: connect(ASANA_CONNECTOR),
  tools: {
    block: [
      "create_tasks",
      "create_task_preview_v4",
      "create_task_confirm",
      "save_task_changes_confirm",
      "update_tasks",
      "delete_task",
      "add_comment",
      "create_project",
      "create_project_preview_v3",
      "create_project_confirm",
      "create_project_confirm_populate",
      "save_project_changes_confirm",
      "create_project_status_update",
      "search_tasks_preview",
      "log_widget_event",
    ],
  },
});
