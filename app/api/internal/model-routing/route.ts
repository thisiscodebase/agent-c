import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalRequest } from "~~/server/utils/internal-api";
import { resolveAgentModelSelection } from "~~/server/utils/model-routing";
import { withRoute } from "~~/server/utils/route-handler";

const querySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  tier: z.enum(["chat", "premium", "extreme"]).optional(),
  reasoning: z.enum(["low", "medium", "high"]).optional(),
});

export const GET = withRoute(async (request: Request) => {
  requireInternalRequest(request);

  const { searchParams } = new URL(request.url);
  const { userId, tier, reasoning } = querySchema.parse(
    Object.fromEntries(searchParams),
  );
  const selection = await resolveAgentModelSelection(userId, { tier, reasoning });

  return NextResponse.json(selection);
});
