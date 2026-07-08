import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import type { ThreadState } from "#shared/types/thread";

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  state: jsonb("state").$type<ThreadState>(),
  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("threads_user_updated_idx").on(table.userId, table.updatedAt),
]);

export const threadsRelations = relations(threads, ({ one }) => ({
  user: one(user, {
    fields: [threads.userId],
    references: [user.id],
  }),
}));
