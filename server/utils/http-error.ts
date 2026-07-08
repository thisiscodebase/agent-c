export class HttpError extends Error {
  statusCode: number;

  constructor(input: { statusCode: number; statusMessage?: string; message?: string }) {
    super(input.message ?? input.statusMessage ?? "Error");
    this.statusCode = input.statusCode;
    this.name = "HttpError";
  }
}

export function createError(input: { statusCode: number; statusMessage?: string; message?: string }): HttpError {
  return new HttpError(input);
}

export function toErrorResponseBody(error: unknown): { statusCode: number; message: string } {
  if (error instanceof HttpError) {
    return { statusCode: error.statusCode, message: error.message };
  }
  return { statusCode: 500, message: "Internal server error" };
}
