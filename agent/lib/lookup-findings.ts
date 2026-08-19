import { z } from "zod";

/** Structured return contract for lookup subagents (Eve task-mode `outputSchema`). */
export const lookupFindingsSchema = z.object({
  summary: z
    .string()
    .describe("Short synthesis of what was found; no source dumps"),
  claims: z
    .array(
      z.object({
        text: z.string().describe("A single evidenced fact"),
        source: z
          .string()
          .describe("System name, e.g. HubSpot, Platform, Notion, Drive, Slack"),
        url: z
          .string()
          .optional()
          .describe("Permalink from tool output; omit if none"),
      }),
    )
    .describe("Evidenced facts for the parent to cite"),
  citations: z
    .array(
      z.object({
        url: z.string(),
        label: z.string().describe("Human label for the linked resource"),
      }),
    )
    .describe("Permalinks that appeared in tool output"),
  gaps: z
    .array(z.string())
    .describe("Sources not searched, empty results, or unanswered parts"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How complete the evidence is for the assigned task"),
});

export type LookupFindings = z.infer<typeof lookupFindingsSchema>;
