import { NextResponse } from "next/server";
import {
  generateTitleBodySchema,
  threadIdParamsSchema,
} from "~~/server/schemas/threads";
import { createError } from "~~/server/utils/http-error";
import { withRoute } from "~~/server/utils/route-handler";
import { requireSessionUserId } from "~~/server/utils/session";
import {
  generateThreadTitleFromSeed,
  generateThreadTitleFromTurns,
} from "~~/server/utils/thread-title";
import {
  countUserTurns,
  extractTitleTurnsFromEvents,
} from "~~/server/utils/thread-title-turns";
import { getThreadForUser, updateThreadForUser } from "~~/server/utils/threads";
import type { ThreadState, ThreadTitleMeta } from "#shared/types/thread";
import {
  shouldRefineThreadTitle,
  shouldSeedThreadTitle,
} from "#shared/types/thread";

type RouteParams = { params: Promise<{ id: string }> };

function withTitleMeta(
  existing: ThreadState | null,
  titleMeta: ThreadTitleMeta,
): ThreadState {
  return {
    session: existing?.session ?? { streamIndex: 0 },
    events: existing?.events ?? [],
    titleMeta,
  };
}

export const POST = withRoute(async (request: Request, { params }: RouteParams) => {
  const { id } = threadIdParamsSchema.parse(await params);
  const userId = await requireSessionUserId(request.headers);
  const body = generateTitleBodySchema.parse(await request.json());

  const thread = await getThreadForUser(userId, id);
  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  const titleMeta = thread.state?.titleMeta;

  if (body.mode === "seed") {
    if (!body.force && !shouldSeedThreadTitle(titleMeta)) {
      return NextResponse.json({ thread, skipped: true });
    }

    const seedText = body.seedText?.trim();
    if (!seedText) {
      throw createError({
        statusCode: 400,
        statusMessage: "seedText is required for seed mode",
      });
    }

    let title: string | undefined;
    try {
      title = await generateThreadTitleFromSeed(seedText, { userId });
    }
    catch (error) {
      console.error("[generate-title] seed failed", { threadId: id, error });
      return NextResponse.json({ thread, skipped: true });
    }

    if (!title) {
      return NextResponse.json({ thread, skipped: true });
    }

    const updated = await updateThreadForUser(userId, id, {
      title,
      state: withTitleMeta(thread.state, {
        lastUserCount: 1,
        lastPhase: "seed",
        source: "generated",
      }),
    });

    return NextResponse.json({ thread: updated });
  }

  const turns = extractTitleTurnsFromEvents(thread.state?.events ?? []);
  const userCount = countUserTurns(turns);

  if (!body.force && !shouldRefineThreadTitle(userCount, titleMeta)) {
    return NextResponse.json({ thread, skipped: true });
  }

  let title: string | undefined;
  try {
    if (turns.length > 0) {
      title = await generateThreadTitleFromTurns(turns, { userId });
    }
    else if (body.force) {
      // Manual rename before any messages: re-title from the current label.
      title = await generateThreadTitleFromSeed(thread.title, { userId });
    }
  }
  catch (error) {
    console.error("[generate-title] refine failed", { threadId: id, error });
    return NextResponse.json({ thread, skipped: true });
  }

  if (!title) {
    return NextResponse.json({ thread, skipped: true });
  }

  const updated = await updateThreadForUser(userId, id, {
    title,
    state: withTitleMeta(thread.state, {
      lastUserCount: Math.max(userCount, 1),
      lastPhase: "refine",
      source: "generated",
    }),
  });

  return NextResponse.json({ thread: updated });
});
