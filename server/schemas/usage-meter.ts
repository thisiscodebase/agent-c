import { z } from "zod";

export const recordUsageMeterBodySchema = z.object({
  userId: z.string().trim().min(1),
  eventId: z.string().trim().min(1),
  costUsd: z.number().finite().nonnegative().default(0),
  sessionId: z.string().trim().min(1).optional(),
  turnId: z.string().trim().min(1).optional(),
  stepIndex: z.number().finite().int().nonnegative().optional(),
});

export const usageMeterUserQuerySchema = z.object({
  userId: z.string().trim().min(1),
});

export const adminUsageLimitBodySchema = z.object({
  limitUsd: z.union([
    z.number().finite().positive().max(10_000),
    z.null(),
  ]),
});

export const adminUsageSettingsBodySchema = z.object({
  defaultLimitUsd: z.number().finite().positive().max(10_000),
});
