import { handleFromEmail } from "#shared/user-handle";
import type { CompanyProfile, LeaderboardEntry } from "#shared/types/usage-stats";
import type { ThreadState } from "#shared/types/thread";
import { db, schema } from "~~/server/db/client";
import { aggregateUsageStats } from "~~/server/utils/usage-stats";

const COMPANY_NAME = "CodeBase";

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const [users, threadRows] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user),
    db
      .select({
        id: schema.threads.id,
        userId: schema.threads.userId,
        createdAt: schema.threads.createdAt,
        updatedAt: schema.threads.updatedAt,
        state: schema.threads.state,
      })
      .from(schema.threads),
  ]);

  const threadsByUser = new Map<
    string,
    Array<{
      id: string;
      createdAt: number;
      updatedAt: number;
      state: ThreadState | null;
    }>
  >();

  for (const row of threadRows) {
    const list = threadsByUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      state: row.state,
    });
    threadsByUser.set(row.userId, list);
  }

  const allThreads = threadRows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    state: row.state,
  }));

  const createdAt = users.reduce(
    (min, user) => Math.min(min, user.createdAt.getTime()),
    users[0]?.createdAt.getTime() ?? Date.now(),
  );

  const stats = aggregateUsageStats(allThreads, createdAt);

  const leaderboard: LeaderboardEntry[] = users
    .map((user) => {
      const handle = handleFromEmail(user.email);
      if (!handle) {
        return null;
      }

      const userThreads = threadsByUser.get(user.id) ?? [];
      const userStats = aggregateUsageStats(userThreads, user.createdAt.getTime());

      return {
        rank: 0,
        name: user.name,
        handle,
        image: user.image,
        totalTokens: userStats.totalTokens,
        agentCount: userStats.agentCount,
      };
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);

  return {
    name: COMPANY_NAME,
    userCount: users.length,
    createdAt,
    stats,
    leaderboard,
  };
}
