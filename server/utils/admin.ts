import { auth } from "~~/auth";
import { createError } from "~~/server/utils/http-error";

function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

export function getAdminEmailAllowlist(): Set<string> {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const allowlist = getAdminEmailAllowlist();
  if (allowlist.size === 0) {
    return false;
  }
  return allowlist.has(email.trim().toLowerCase());
}

export async function requireAdminSession(headers: Headers): Promise<{
  userId: string;
  email: string;
}> {
  const session = await auth.api.getSession({ headers });
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId || !email) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  if (!isAdminEmail(email)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  return { userId, email };
}
