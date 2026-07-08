import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "~~/server/db/client";

const productionUrl = process.env.BETTER_AUTH_URL?.trim();

export const auth = betterAuth({
  baseURL: productionUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: productionUrl ? [productionUrl] : undefined,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      hd: process.env.GOOGLE_WORKSPACE_DOMAIN,
    },
  },
  plugins: [nextCookies()],
});
