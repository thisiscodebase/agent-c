import { auth } from "~~/auth";
import { createError } from "~~/server/utils/http-error";

export async function requireSessionUser(headers: Headers): Promise<{
  userId: string;
  email: string | null;
}> {
  const session = await auth.api.getSession({ headers });
  const userId = session?.user?.id;

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return {
    userId,
    email: session.user.email ?? null,
  };
}

export async function requireSessionUserId(headers: Headers): Promise<string> {
  const { userId } = await requireSessionUser(headers);
  return userId;
}
