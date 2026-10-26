import { z } from "zod";

/**
 * Structured return contract lookup subagents are instructed to follow.
 * Eve no longer accepts `outputSchema` on `defineAgent`; a workflow `send()`
 * is what enforces it. Instructions still ask for this shape.
 */
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

/**
 * A parked child (`waiting`) still returns `data`. Only a failed turn, or a
 * cancel that left no payload, is an error for the parent tool.
 */
export function requireLookupFindings(
  name: string,
  result: {
    status: string;
    data?: LookupFindings;
    error?: { message: string };
  },
): LookupFindings {
  if (result.status === "failed" || result.data == null) {
    throw new Error(result.error?.message ?? `${name} ${result.status}`);
  }
  return result.data;
}
