import { z } from "zod";

export const threadIdParamsSchema = z.object({
  id: z.string().trim().uuid("Thread id must be a UUID"),
});

export const createThreadBodySchema = z.object({
  id: z.string().trim().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
});

const eveSessionSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  continuationToken: z.string().trim().min(1).optional(),
  streamIndex: z.number().int().min(0),
});

export const threadTitleMetaSchema = z.object({
  lastUserCount: z.number().int().min(0),
  lastPhase: z.enum(["seed", "refine"]),
  source: z.enum(["truncated", "generated"]),
});

export const threadStateSchema = z.object({
  session: eveSessionSchema,
  events: z.array(z.unknown()),
  titleMeta: threadTitleMetaSchema.optional(),
});

export const patchThreadBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  state: threadStateSchema.optional(),
});

export const generateTitleBodySchema = z.object({
  mode: z.enum(["seed", "refine"]),
  seedText: z.string().trim().min(1).max(4000).optional(),
  /** Bypass cadence/dedupe gates (e.g. manual Rename from the sidebar). */
  force: z.boolean().optional(),
});
