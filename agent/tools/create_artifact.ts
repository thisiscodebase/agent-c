import { defineTool } from "eve/tools";
import { z } from "zod";
import { ARTIFACT_TYPES, buildArtifactPreview } from "../../shared/types/artifact.js";
import { createArtifactRemote } from "../lib/artifact-internal.js";

export default defineTool({
  description:
    "Save a synthesized markdown document as a durable artifact the user can reopen, edit, and share. Use for substantial multi-source syntheses (case studies, reports, summaries) the user will want to keep — not for ordinary chat answers. Saves immediately as a draft; the user reviews it afterwards.",
  inputSchema: z.object({
    type: z.enum(ARTIFACT_TYPES).describe("Kind of document being saved"),
    title: z.string().min(1).max(200).describe("Short descriptive title"),
    contentMarkdown: z
      .string()
      .min(1)
      .describe("Full document body in markdown, including headings and any source citations"),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Optional structured fields for this artifact type, e.g. { customer, interventions } for a case study",
      ),
  }),
  async execute({ type, title, contentMarkdown, metadata }, ctx) {
    const userId = ctx.session.auth.current?.principalId;
    if (!userId) {
      throw new Error("Cannot create an artifact without an authenticated user");
    }

    const artifact = await createArtifactRemote({
      userId,
      type,
      title,
      contentMarkdown,
      metadata,
    });

    return {
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      status: artifact.status,
      colour: artifact.colour,
      preview: buildArtifactPreview(artifact.contentMarkdown),
    };
  },
  // The full body is already in the transcript from the tool call; echoing it
  // back would double its cost in context.
  toModelOutput(output) {
    return {
      type: "text",
      value: `Saved "${output.title}" as a ${output.status} ${output.type} artifact (id ${output.id}). It is shown to the user as a card they can open; do not repeat the document body in your reply.`,
    };
  },
});
