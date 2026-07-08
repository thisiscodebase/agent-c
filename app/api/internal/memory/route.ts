import { NextResponse } from "next/server";
import { z } from "zod";
import { internalMemoryQuerySchema, memoryCategorySchema } from "~~/server/schemas/memory";
import { listMemoryForUser, setMemoryForCategory } from "~~/server/utils/memory";
import { getOrCreateProfileForUser } from "~~/server/utils/profile";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { withRoute } from "~~/server/utils/route-handler";

export const GET = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const { searchParams } = new URL(request.url);
  const { userId } = internalMemoryQuerySchema.parse(Object.fromEntries(searchParams));
  const [profile, memory] = await Promise.all([
    getOrCreateProfileForUser(userId),
    listMemoryForUser(userId),
  ]);

  return NextResponse.json({ profile, memory });
});

const saveMemoryBodySchema = z.object({
  userId: z.string().trim().min(1),
  category: memoryCategorySchema,
  content: z.string().trim().min(1),
  source: z.enum(["import", "agent", "manual"]).default("agent"),
});

export const POST = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const body = saveMemoryBodySchema.parse(await request.json());
  const result = await setMemoryForCategory(body.userId, {
    category: body.category,
    content: body.content,
    source: body.source,
  });

  if (!result.saved) {
    return NextResponse.json({ saved: false, reason: result.reason ?? "unchanged" as const });
  }

  return NextResponse.json({ saved: true, entry: result.entry });
});
