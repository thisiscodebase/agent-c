import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userMemory = pgTable("user_memory", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("user_memory_user_category_idx").on(table.userId, table.category),
]);

export const userMemoryRelations = relations(userMemory, ({ one }) => ({
  user: one(user, {
    fields: [userMemory.userId],
    references: [user.id],
  }),
}));
