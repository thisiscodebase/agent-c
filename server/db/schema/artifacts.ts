import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { threads } from "./threads";
import type { ArtifactColour, ArtifactStatus, ArtifactType } from "#shared/types/artifact";

export const artifacts = pgTable("artifacts", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Nullable: artifacts can originate outside a web thread (e.g. Slack).
  threadId: text("thread_id")
    .references(() => threads.id, { onDelete: "set null" }),
  type: text("type").$type<ArtifactType>().notNull(),
  title: text("title").notNull(),
  contentMarkdown: text("content_markdown").notNull(),
  status: text("status").$type<ArtifactStatus>().notNull().default("draft"),
  colour: text("colour").$type<ArtifactColour>().notNull().default("white"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("artifacts_author_updated_idx").on(table.authorId, table.updatedAt),
]);

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  author: one(user, {
    fields: [artifacts.authorId],
    references: [user.id],
  }),
  thread: one(threads, {
    fields: [artifacts.threadId],
    references: [threads.id],
  }),
}));
