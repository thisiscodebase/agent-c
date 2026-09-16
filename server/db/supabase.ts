import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Hosted Vercel + Supabase integration uses `NEXT_PUBLIC_SUPABASE_URL` and
 * `SUPABASE_SECRET_KEY`. Local / docs still use `SUPABASE_URL` +
 * `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function resolveSupabaseStorageConfig(): { url: string; key: string } {
  const url =
    process.env.SUPABASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || "";

  if (!url || !key) {
    throw new Error(
      "Supabase Storage requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)",
    );
  }

  return { url, key };
}

/** Service-role Supabase client for Storage (and other non-Postgres APIs). */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) {
    return cached;
  }

  const { url, key } = resolveSupabaseStorageConfig();

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}

export const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
