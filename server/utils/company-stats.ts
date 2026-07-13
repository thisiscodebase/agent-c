import { handleFromEmail } from "#shared/user-handle";
import type {
  AdminCompanyProfile,
  AdminLeaderboardEntry,
  CompanyProfile,
  LeaderboardEntry,
} from "#shared/types/usage-stats";
import type { ThreadState } from "#shared/types/thread";
import { db, schema } from "~~/server/db/client";
import { aggregateUsageStats, toPublicUsageStats } from "~~/server/utils/usage-stats";

const COMPANY_NAME = "CodeBase";

type ThreadRow = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  state: ThreadState | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
};

async function loadCompanyRows(): Promise<{ users: UserRow[]; threads: ThreadRow[] }> {
  const [users, threads] = await Promise.all([
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
        title: schema.threads.title,
        createdAt: schema.threads.createdAt,
        updatedAt: schema.threads.updatedAt,
        state: schema.threads.state,
      })
      .from(schema.threads),
  ]);

  return { users, threads };
}

function groupThreadsByUser(threads: ThreadRow[]) {
  const threadsByUser = new Map<
    string,
    Array<{
      id: string;
      title: string;
      createdAt: number;
      updatedAt: number;
      state: ThreadState | null;
    }>
  >();

  for (const row of threads) {
    const list = threadsByUser.get(row.userId) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      state: row.state,
    });
    threadsByUser.set(row.userId, list);
  }

  return threadsByUser;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const { users, threads } = await loadCompanyRows();
  const threadsByUser = groupThreadsByUser(threads);

  const allThreads = threads.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    state: row.state,
  }));

  const createdAt = users.reduce(
    (min, user) => Math.min(min, user.createdAt.getTime()),
    users[0]?.createdAt.getTime() ?? Date.now(),
  );

  const stats = toPublicUsageStats(aggregateUsageStats(allThreads, createdAt));

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

export async function getAdminCompanyProfile(): Promise<AdminCompanyProfile> {
  const { users, threads } = await loadCompanyRows();
  const threadsByUser = groupThreadsByUser(threads);

  const allThreads = threads.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    state: row.state,
  }));

  const createdAt = users.reduce(
    (min, user) => Math.min(min, user.createdAt.getTime()),
    users[0]?.createdAt.getTime() ?? Date.now(),
  );

  const stats = aggregateUsageStats(allThreads, createdAt);

  const leaderboard: AdminLeaderboardEntry[] = users
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
        totalCostUsd: userStats.totalCostUsd,
      };
    })
    .filter((entry): entry is AdminLeaderboardEntry => entry !== null);

  return {
    name: COMPANY_NAME,
    userCount: users.length,
    createdAt,
    stats,
    leaderboard,
  };
}
