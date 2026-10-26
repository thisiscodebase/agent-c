import { defineWorkflowTool } from "eve/tools";
import { z } from "zod";
import { lookupFindingsSchema, requireLookupFindings } from "../lib/lookup-findings.js";
import { LOOKUP_SUBAGENT_DESCRIPTIONS } from "../lib/lookup-subagent.js";

// The child lives at `subagents/lookup-slack-scan`. Eve 0.82 rejects a tool
// and a local agent that share a public name, including when `tool: false`.
const LOOKUP_SLACK_SCAN_AGENT = "lookup-slack-scan";

export default defineWorkflowTool({
  description: LOOKUP_SUBAGENT_DESCRIPTIONS["slack-scan"],
  inputSchema: z.object({
    message: z
      .string()
      .describe(
        "Packed context the specialist does not otherwise see: entity names, date window, focus, and what to return",
      ),
  }),
  async execute(input, ctx) {
    "use workflow";
    const response = await ctx.agent(LOOKUP_SLACK_SCAN_AGENT).send(input.message, {
      outputSchema: lookupFindingsSchema,
      signal: ctx.abortSignal,
    });
    const result = await response.result();
    return requireLookupFindings("slack-scan", result);
  },
});
