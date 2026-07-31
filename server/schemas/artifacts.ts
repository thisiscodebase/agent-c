import { z } from "zod";
import { ARTIFACT_COLOURS, ARTIFACT_STATUSES, ARTIFACT_TYPES } from "#shared/types/artifact";

export const artifactTypeSchema = z.enum(ARTIFACT_TYPES);
export const artifactStatusSchema = z.enum(ARTIFACT_STATUSES);
export const artifactColourSchema = z.enum(ARTIFACT_COLOURS);

const artifactMetadataSchema = z.record(z.string(), z.unknown());

export const artifactIdParamsSchema = z.object({
  id: z.string().trim().uuid("Artifact id must be a UUID"),
});

export const createArtifactBodySchema = z.object({
  type: artifactTypeSchema,
  title: z.string().trim().min(1).max(200),
  contentMarkdown: z.string().trim().min(1).max(200000),
  colour: artifactColourSchema.optional(),
  metadata: artifactMetadataSchema.optional(),
  threadId: z.string().trim().uuid().optional(),
});

export const patchArtifactBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  contentMarkdown: z.string().trim().min(1).max(200000).optional(),
  status: artifactStatusSchema.optional(),
  colour: artifactColourSchema.optional(),
  metadata: artifactMetadataSchema.optional(),
});

export const internalCreateArtifactBodySchema = createArtifactBodySchema.extend({
  userId: z.string().trim().min(1),
});
