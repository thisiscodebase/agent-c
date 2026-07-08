import { createAuthClient } from "better-auth/react";

// Server-side fetches (RSC prefetch, etc.) require an absolute base URL; the browser can use same-origin.
const baseURL = typeof window === "undefined"
  ? (process.env.BETTER_AUTH_URL || "http://localhost:3000")
  : undefined;

export const authClient = createAuthClient(baseURL ? { baseURL } : undefined);
