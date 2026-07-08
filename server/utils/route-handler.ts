import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "~~/server/utils/http-error";

export function withRoute<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse | Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    }
    catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ message: error.message }, { status: error.statusCode });
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: "Invalid request", issues: error.issues },
          { status: 400 },
        );
      }
      console.error(error);
      return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
  };
}
