import { NextResponse } from "next/server";
import { threadFeedbackBodySchema, threadIdParamsSchema } from "~~/server/schemas/threads";
import { requireSessionUserId } from "~~/server/utils/session";
import { upsertThreadFeedbackForUser } from "~~/server/utils/thread-feedback";
import { withRoute } from "~~/server/utils/route-handler";

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);
  const body = threadFeedbackBodySchema.parse(await request.json());

  const feedback = await upsertThreadFeedbackForUser(userId, id, body);

  return NextResponse.json({
    feedback: {
      id: feedback.id,
      rating: feedback.rating,
      comment: feedback.comment,
      updatedAt: feedback.updatedAt.getTime(),
    },
  });
});
