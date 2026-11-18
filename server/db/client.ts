import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Supavisor transaction-mode pooling does not support prepared statements.
// `infer: true` keeps postgres.js 3 parameter typing. v4 otherwise lets the
// server decide, which changes how Dates bind to `timestamp` columns.
const client = postgres(connectionString, { prepare: false, infer: true });

export const db = drizzle(client, { schema });
export { schema };
