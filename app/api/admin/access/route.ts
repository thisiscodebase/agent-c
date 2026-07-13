import { NextResponse } from "next/server";
import { isAdminEmail } from "~~/server/utils/admin";
import { withRoute } from "~~/server/utils/route-handler";
import { auth } from "~~/auth";

export const GET = withRoute(async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email;
  return NextResponse.json({
    allowed: Boolean(session?.user?.id) && isAdminEmail(email),
  });
});
