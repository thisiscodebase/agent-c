import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { threads } from "./threads";

export const chatAttachments = pgTable("chat_attachments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  threadId: text("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  /** PDF page count when known. */
  pageCount: integer("page_count"),
  /** CSV data-row count (excludes header) when known. */
  rowCount: integer("row_count"),
  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("chat_attachments_user_thread_idx").on(table.userId, table.threadId),
  index("chat_attachments_thread_idx").on(table.threadId),
]);

export const chatAttachmentsRelations = relations(chatAttachments, ({ one }) => ({
  user: one(user, {
    fields: [chatAttachments.userId],
    references: [user.id],
  }),
  thread: one(threads, {
    fields: [chatAttachments.threadId],
    references: [threads.id],
  }),
}));
