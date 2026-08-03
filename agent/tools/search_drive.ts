import { defineTool } from "eve/tools";
import { z } from "zod";
import { driveAuth } from "../lib/drive-auth.js";
import {
  DRIVE_FILE_FIELDS,
  buildDriveSearchQuery,
  listDriveFiles,
  resolveDriveIdQuery,
} from "../lib/drive-api.js";

/**
 * Temporary Drive REST search — bypasses hosted Drive MCP
 * (`drivemcp.googleapis.com`) which returns permission errors on data-plane
 * calls. Uses the same Connect OAuth grant as Settings → Integrations.
 *
 * @see https://developers.google.com/drive/api/reference/rest/v3/files/list
 */
export default defineTool({
  description:
    "Search Google Drive files the signed-in user can access (name and full-text). If given a Drive URL or bare file/Shared-Drive id, resolves it via files.get / drives.get instead of text search. Drive ACLs are the security boundary — do not invent files.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "Keyword/phrase for name and full-text search, or a Drive URL / bare file id / Shared Drive id.",
      ),
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
      .describe("Pagination token from a previous search_drive call."),
  }),
  async execute({ query, pageSize, pageToken }, ctx) {
    const { token } = await ctx.getToken(driveAuth);

    const resolved = await resolveDriveIdQuery(token, query);
    if (resolved) {
      return {
        files: resolved.files,
        resolvedAs: resolved.resolvedAs,
        note: resolved.note,
      };
    }

    const params = new URLSearchParams({
      q: buildDriveSearchQuery(query),
      pageSize: String(pageSize ?? 10),
      fields: DRIVE_FILE_FIELDS,
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    return listDriveFiles(token, params);
  },
});
