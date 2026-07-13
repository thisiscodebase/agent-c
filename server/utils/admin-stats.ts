import { eq } from "drizzle-orm";
import type { AdminUserDetail } from "#shared/types/usage-stats";
import { handleFromEmail, isValidHandle } from "#shared/user-handle";
import { db, schema } from "~~/server/db/client";
import { findUserByHandle } from "~~/server/utils/public-profile";
import { aggregateUsageStats } from "~~/server/utils/usage-stats";
import { createError } from "~~/server/utils/http-error";

export async function getAdminUserDetail(handle: string): Promise<AdminUserDetail> {
  if (!isValidHandle(handle)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid handle" });
  }

  const user = await findUserByHandle(handle);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  const resolvedHandle = handleFromEmail(user.email);
  if (!resolvedHandle) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  const threadRows = await db
    .select({
      id: schema.threads.id,
      title: schema.threads.title,
      createdAt: schema.threads.createdAt,
      updatedAt: schema.threads.updatedAt,
      state: schema.threads.state,
    })
    .from(schema.threads)
    .where(eq(schema.threads.userId, user.id));

  const aggregated = aggregateUsageStats(
    threadRows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      state: row.state,
    })),
    user.createdAt.getTime(),
    Date.now(),
    { includeThreads: true },
  );

  const { threads, ...stats } = aggregated;

  return {
    name: user.name,
    handle: resolvedHandle,
    image: user.image,
    email: user.email,
    createdAt: user.createdAt.getTime(),
    stats,
    threads: threads ?? [],
  };
}
