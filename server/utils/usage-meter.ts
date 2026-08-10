import { and, eq, sql } from "drizzle-orm";
import { handleFromEmail } from "#shared/user-handle";
import type {
  AdminUsageMeterRow,
  UsageMeterSettings,
  UsageMeterSnapshot,
} from "#shared/types/usage-meter";
import {
  DEFAULT_USER_USAGE_LIMIT_USD,
  effectiveUsageLimitUsd,
  usageMeterPercent,
  usageMeterStatus,
  usagePeriodKey,
  usagePeriodResetsAt,
} from "#shared/usage-meter";
import { db, schema } from "~~/server/db/client";
import type { ThreadState } from "#shared/types/thread";

const SETTINGS_ID = "default";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function eventAtMs(event: Record<string, unknown>): number | null {
  const meta = asRecord(event.meta);
  const at = meta?.at;
  if (typeof at !== "string") {
    return null;
  }
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? ms : null;
}

/** Sum `costUsd` from thread `step.completed` events in the given UTC month. */
export function sumThreadCostUsdForPeriod(
  threads: Array<{ state: ThreadState | null }>,
  periodKey: string,
): number {
  let total = 0;
  for (const thread of threads) {
    const events = thread.state?.events;
    if (!Array.isArray(events)) {
      continue;
    }
    for (const raw of events) {
      const event = asRecord(raw);
      if (!event || event.type !== "step.completed") {
        continue;
      }
      const at = eventAtMs(event);
      if (at === null || usagePeriodKey(new Date(at)) !== periodKey) {
        continue;
      }
      const data = asRecord(event.data);
      const usage = asRecord(data?.usage);
      const cost = usage?.costUsd;
      if (typeof cost === "number" && Number.isFinite(cost) && cost > 0) {
        total += cost;
      }
    }
  }
  return total;
}

export async function getUsageMeterSettings(): Promise<UsageMeterSettings> {
  const [row] = await db
    .select({
      defaultLimitUsd: schema.usageMeterSettings.defaultLimitUsd,
      updatedAt: schema.usageMeterSettings.updatedAt,
    })
    .from(schema.usageMeterSettings)
    .where(eq(schema.usageMeterSettings.id, SETTINGS_ID))
    .limit(1);

  if (
    row
    && typeof row.defaultLimitUsd === "number"
    && Number.isFinite(row.defaultLimitUsd)
    && row.defaultLimitUsd > 0
  ) {
    return {
      defaultLimitUsd: row.defaultLimitUsd,
      updatedAt: row.updatedAt?.getTime() ?? null,
    };
  }

  // Ensure a row exists so admins can edit without a redeploy.
  await db
    .insert(schema.usageMeterSettings)
    .values({
      id: SETTINGS_ID,
      defaultLimitUsd: DEFAULT_USER_USAGE_LIMIT_USD,
    })
    .onConflictDoNothing();

  return {
    defaultLimitUsd: DEFAULT_USER_USAGE_LIMIT_USD,
    updatedAt: null,
  };
}

export async function setUsageMeterDefaultLimit(
  defaultLimitUsd: number,
): Promise<UsageMeterSettings> {
  if (!Number.isFinite(defaultLimitUsd) || defaultLimitUsd <= 0) {
    throw new Error("defaultLimitUsd must be a positive number");
  }

  await db
    .insert(schema.usageMeterSettings)
    .values({
      id: SETTINGS_ID,
      defaultLimitUsd,
    })
    .onConflictDoUpdate({
      target: schema.usageMeterSettings.id,
      set: { defaultLimitUsd },
    });

  return getUsageMeterSettings();
}

async function loadLimitOverride(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ limitUsd: schema.userUsageLimits.limitUsd })
    .from(schema.userUsageLimits)
    .where(eq(schema.userUsageLimits.userId, userId))
    .limit(1);

  const value = row?.limitUsd;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return null;
}

async function loadPeriodUsed(userId: string, periodKey: string): Promise<number | null> {
  const [row] = await db
    .select({ usedUsd: schema.userUsagePeriods.usedUsd })
    .from(schema.userUsagePeriods)
    .where(
      and(
        eq(schema.userUsagePeriods.userId, userId),
        eq(schema.userUsagePeriods.periodKey, periodKey),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }
  return typeof row.usedUsd === "number" && Number.isFinite(row.usedUsd) ? row.usedUsd : 0;
}

async function bootstrapPeriodFromThreads(userId: string, periodKey: string): Promise<number> {
  const threads = await db
    .select({ state: schema.threads.state })
    .from(schema.threads)
    .where(eq(schema.threads.userId, userId));

  const usedUsd = sumThreadCostUsdForPeriod(threads, periodKey);

  await db
    .insert(schema.userUsagePeriods)
    .values({
      userId,
      periodKey,
      usedUsd,
    })
    .onConflictDoNothing();

  // Re-read in case a concurrent writer already inserted.
  const existing = await loadPeriodUsed(userId, periodKey);
  return existing ?? usedUsd;
}

/**
 * Ensure a period counter exists. Bootstrap from threads only when creating
 * the row — never re-seed an existing row (so admin resets stick).
 */
async function ensurePeriodUsed(userId: string, periodKey: string): Promise<number> {
  const existing = await loadPeriodUsed(userId, periodKey);
  if (existing !== null) {
    return existing;
  }
  return bootstrapPeriodFromThreads(userId, periodKey);
}

function toSnapshot(
  usedUsd: number,
  limitOverrideUsd: number | null,
  defaultLimitUsd: number,
  periodKey: string,
): UsageMeterSnapshot {
  const limitUsd = effectiveUsageLimitUsd(limitOverrideUsd, defaultLimitUsd);
  return {
    usedUsd,
    limitUsd,
    limitOverrideUsd,
    defaultLimitUsd,
    percent: usageMeterPercent(usedUsd, limitUsd),
    status: usageMeterStatus(usedUsd, limitUsd),
    periodKey,
    resetsAt: usagePeriodResetsAt(periodKey),
  };
}

export async function getUsageMeterForUser(userId: string): Promise<UsageMeterSnapshot> {
  const periodKey = usagePeriodKey();
  const [usedUsd, limitOverrideUsd, settings] = await Promise.all([
    ensurePeriodUsed(userId, periodKey),
    loadLimitOverride(userId),
    getUsageMeterSettings(),
  ]);
  return toSnapshot(usedUsd, limitOverrideUsd, settings.defaultLimitUsd, periodKey);
}

export async function isUsageBlockedForUser(userId: string): Promise<boolean> {
  const meter = await getUsageMeterForUser(userId);
  return meter.status === "blocked";
}

export type RecordUsageMeterInput = {
  userId: string;
  eventId: string;
  costUsd: number;
  sessionId?: string;
  turnId?: string;
  stepIndex?: number;
};

export type RecordUsageMeterResult = {
  recorded: boolean;
  meter: UsageMeterSnapshot;
};

export async function recordUsageMeterEvent(
  input: RecordUsageMeterInput,
): Promise<RecordUsageMeterResult> {
  const periodKey = usagePeriodKey();
  const costUsd =
    typeof input.costUsd === "number" && Number.isFinite(input.costUsd) && input.costUsd > 0
      ? input.costUsd
      : 0;

  // Ensure period row exists (and optionally bootstrapped) before incrementing.
  await ensurePeriodUsed(input.userId, periodKey);

  const inserted = await db
    .insert(schema.usageMeterEvents)
    .values({
      eventId: input.eventId,
      userId: input.userId,
      periodKey,
      costUsd,
      sessionId: input.sessionId ?? null,
      turnId: input.turnId ?? null,
      stepIndex: typeof input.stepIndex === "number" ? input.stepIndex : null,
    })
    .onConflictDoNothing()
    .returning({ eventId: schema.usageMeterEvents.eventId });

  const recorded = inserted.length > 0;
  if (recorded && costUsd > 0) {
    await db
      .update(schema.userUsagePeriods)
      .set({
        usedUsd: sql`${schema.userUsagePeriods.usedUsd} + ${costUsd}`,
      })
      .where(
        and(
          eq(schema.userUsagePeriods.userId, input.userId),
          eq(schema.userUsagePeriods.periodKey, periodKey),
        ),
      );
  }

  const meter = await getUsageMeterForUser(input.userId);
  return { recorded, meter };
}

export async function setUsageLimitOverride(
  userId: string,
  limitUsd: number | null,
): Promise<UsageMeterSnapshot> {
  if (limitUsd === null) {
    await db.delete(schema.userUsageLimits).where(eq(schema.userUsageLimits.userId, userId));
  } else {
    await db
      .insert(schema.userUsageLimits)
      .values({
        userId,
        limitUsd,
      })
      .onConflictDoUpdate({
        target: schema.userUsageLimits.userId,
        set: { limitUsd },
      });
  }
  return getUsageMeterForUser(userId);
}

/** Zero this month's soft-meter counter for a user (does not delete chat history). */
export async function resetUsageMeterForUser(userId: string): Promise<UsageMeterSnapshot> {
  const periodKey = usagePeriodKey();

  await db
    .insert(schema.userUsagePeriods)
    .values({
      userId,
      periodKey,
      usedUsd: 0,
    })
    .onConflictDoUpdate({
      target: [schema.userUsagePeriods.userId, schema.userUsagePeriods.periodKey],
      set: { usedUsd: 0 },
    });

  await db
    .delete(schema.usageMeterEvents)
    .where(
      and(
        eq(schema.usageMeterEvents.userId, userId),
        eq(schema.usageMeterEvents.periodKey, periodKey),
      ),
    );

  return getUsageMeterForUser(userId);
}

export async function listAdminUsageMeters(): Promise<{
  meters: AdminUsageMeterRow[];
  settings: UsageMeterSettings;
}> {
  const periodKey = usagePeriodKey();
  const settings = await getUsageMeterSettings();
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
    })
    .from(schema.user);

  const [periods, limits] = await Promise.all([
    db
      .select({
        userId: schema.userUsagePeriods.userId,
        usedUsd: schema.userUsagePeriods.usedUsd,
      })
      .from(schema.userUsagePeriods)
      .where(eq(schema.userUsagePeriods.periodKey, periodKey)),
    db.select().from(schema.userUsageLimits),
  ]);

  const usedByUser = new Map(
    periods.map((row) => [row.userId, row.usedUsd ?? 0] as const),
  );
  const limitByUser = new Map(
    limits.map((row) => [row.userId, row.limitUsd] as const),
  );

  const rows: AdminUsageMeterRow[] = [];
  for (const user of users) {
    const handle = handleFromEmail(user.email);
    if (!handle) {
      continue;
    }
    const usedUsd = usedByUser.get(user.id) ?? 0;
    const rawOverride = limitByUser.get(user.id);
    const limitOverrideUsd =
      typeof rawOverride === "number" && Number.isFinite(rawOverride) && rawOverride > 0
        ? rawOverride
        : null;
    const limitUsd = effectiveUsageLimitUsd(limitOverrideUsd, settings.defaultLimitUsd);
    rows.push({
      userId: user.id,
      name: user.name,
      handle,
      email: user.email,
      image: user.image,
      usedUsd,
      limitUsd,
      limitOverrideUsd,
      percent: usageMeterPercent(usedUsd, limitUsd),
      status: usageMeterStatus(usedUsd, limitUsd),
      periodKey,
    });
  }

  rows.sort((a, b) => b.usedUsd - a.usedUsd || a.name.localeCompare(b.name));
  return { meters: rows, settings };
}
