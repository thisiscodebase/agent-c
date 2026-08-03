import { defineTool } from "eve/tools";
import { z } from "zod";
import { driveAuth } from "../lib/drive-auth.js";
import { DRIVE_FILE_FIELDS, listDriveFiles } from "../lib/drive-api.js";

/**
 * Temporary Drive REST recent-files list — same path as Integrations
 * "List recent files", bypassing hosted Drive MCP.
 *
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/list
 */
export default defineTool({
  description:
    "List recently modified Google Drive files the signed-in user can access (My Drive + Shared Drives). Use when the user asks what files they have or what they can access, without a specific search query.",
  inputSchema: z.object({
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("Max results (1–25). Defaults to 10."),
    pageToken: z
      .string()
      .optional()
      .describe("Pagination token from a previous list_recent_drive call."),
  }),
  async execute({ pageSize, pageToken }, ctx) {
    const { token } = await ctx.getToken(driveAuth);

    const params = new URLSearchParams({
      q: "trashed = false",
      orderBy: "modifiedTime desc",
      pageSize: String(pageSize ?? 10),
      fields: DRIVE_FILE_FIELDS,
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    return listDriveFiles(token, params);
  },
});
