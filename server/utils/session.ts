import { auth } from "~~/auth";
import { createError } from "~~/server/utils/http-error";

export async function requireSessionUserId(headers: Headers): Promise<string> {
  const session = await auth.api.getSession({ headers });

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return session.user.id;
}
