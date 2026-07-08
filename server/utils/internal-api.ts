import { createError } from "~~/server/utils/http-error";

export function getRequestOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const protocolHeader = request.headers.get("x-forwarded-proto");
  const protocol = protocolHeader?.split(",")[0]?.trim() ?? "http";

  return `${protocol}://${host}`;
}

export function requireInternalRequest(request: Request) {
  const secret = process.env.INTERNAL_API_SECRET?.trim();

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: "Internal API is not configured",
    });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }
}
