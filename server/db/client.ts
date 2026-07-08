import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Supavisor transaction-mode pooling does not support prepared statements.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
