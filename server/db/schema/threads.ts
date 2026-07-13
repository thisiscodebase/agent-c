import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

export type ThreadFeedbackRating = "good" | "bad";

export const threadFeedback = pgTable("thread_feedback", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: text("rating").$type<ThreadFeedbackRating>().notNull(),
  comment: text("comment"),
  messageId: text("message_id"),
  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex("thread_feedback_thread_user_idx").on(table.threadId, table.userId),
  index("thread_feedback_rating_idx").on(table.rating, table.updatedAt),
]);

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(user, {
    fields: [threads.userId],
    references: [user.id],
  }),
  feedback: many(threadFeedback),
}));

export const threadFeedbackRelations = relations(threadFeedback, ({ one }) => ({
  thread: one(threads, {
    fields: [threadFeedback.threadId],
    references: [threads.id],
  }),
  user: one(user, {
    fields: [threadFeedback.userId],
    references: [user.id],
  }),
}));
