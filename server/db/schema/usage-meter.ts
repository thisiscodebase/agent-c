import { relations } from "drizzle-orm";
import {
  doublePrecision,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Singleton company metering settings (`id` is always `default`). */
export const usageMeterSettings = pgTable("usage_meter_settings", {
  id: text("id").primaryKey().default("default"),
  defaultLimitUsd: doublePrecision("default_limit_usd").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** Optional per-user monthly USD cap override (null / missing → company default). */
export const userUsageLimits = pgTable("user_usage_limits", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  limitUsd: doublePrecision("limit_usd"),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/** Running monthly spend totals for soft metering (not analytics). */
export const userUsagePeriods = pgTable(
  "user_usage_periods",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    periodKey: text("period_key").notNull(),
    usedUsd: doublePrecision("used_usd").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.periodKey] }),
    index("user_usage_periods_period_idx").on(table.periodKey),
  ],
);

/**
 * Idempotency keys for Eve `step.completed` metering hooks.
 * Not a rich analytics ledger — prevents double-count on hook retries.
 */
export const usageMeterEvents = pgTable(
  "usage_meter_events",
  {
    eventId: text("event_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    periodKey: text("period_key").notNull(),
    costUsd: doublePrecision("cost_usd").notNull().default(0),
    sessionId: text("session_id"),
    turnId: text("turn_id"),
    stepIndex: doublePrecision("step_index"),
    createdAt: timestamp("created_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_meter_events_user_period_idx").on(table.userId, table.periodKey),
  ],
);

export const userUsageLimitsRelations = relations(userUsageLimits, ({ one }) => ({
  user: one(user, {
    fields: [userUsageLimits.userId],
    references: [user.id],
  }),
}));

export const userUsagePeriodsRelations = relations(userUsagePeriods, ({ one }) => ({
  user: one(user, {
    fields: [userUsagePeriods.userId],
    references: [user.id],
  }),
}));

export const usageMeterEventsRelations = relations(usageMeterEvents, ({ one }) => ({
  user: one(user, {
    fields: [usageMeterEvents.userId],
    references: [user.id],
  }),
}));
