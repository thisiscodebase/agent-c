import { eq, sql } from "drizzle-orm";
import { handleFromEmail, isValidHandle } from "#shared/user-handle";
import type { PublicUserProfile } from "#shared/types/usage-stats";
import { db, schema } from "~~/server/db/client";
import { aggregateUsageStats } from "~~/server/utils/usage-stats";

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function findUserByHandle(handle: string) {
  if (!isValidHandle(handle)) {
    return undefined;
  }

  const pattern = `${escapeLikePattern(handle)}@%`;
  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      createdAt: schema.user.createdAt,
      bio: schema.userProfiles.bio,
    })
    .from(schema.user)
    .leftJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.user.id))
    .where(sql`${schema.user.email} LIKE ${pattern} ESCAPE '\\'`)
    .limit(10);

  return rows.find((row) => handleFromEmail(row.email) === handle);
}

export async function getPublicProfileByHandle(
  handle: string,
  viewerUserId: string,
): Promise<PublicUserProfile | undefined> {
  const user = await findUserByHandle(handle);
  if (!user) {
    return undefined;
  }

  const threadRows = await db
    .select({
      id: schema.threads.id,
      createdAt: schema.threads.createdAt,
      updatedAt: schema.threads.updatedAt,
      state: schema.threads.state,
    })
    .from(schema.threads)
    .where(eq(schema.threads.userId, user.id));

  const stats = aggregateUsageStats(
    threadRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      state: row.state,
    })),
    user.createdAt.getTime(),
  );

  return {
    name: user.name,
    handle,
    image: user.image,
    bio: user.bio ?? "",
    createdAt: user.createdAt.getTime(),
    isOwn: user.id === viewerUserId,
    stats,
  };
}
