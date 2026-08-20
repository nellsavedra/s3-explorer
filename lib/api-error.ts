export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

interface S3LikeError {
  name?: string;
  message?: string;
  $metadata?: { httpStatusCode?: number };
}

/**
 * Maps any error thrown inside an API route (including AWS SDK errors)
 * to a JSON response with a sensible status code.
 */
export function apiErrorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const e = error as S3LikeError;
  const s3Status = e.$metadata?.httpStatusCode;

  if (e.name === "AccessDenied" || s3Status === 403) {
    return Response.json(
      { error: "Access denied by the bucket IAM policy" },
      { status: 403 },
    );
  }

  if (e.name === "NoSuchKey" || s3Status === 404) {
    return Response.json({ error: "Object not found" }, { status: 404 });
  }

  const status = s3Status && s3Status >= 400 && s3Status < 600 ? s3Status : 500;
  return Response.json(
    { error: e.message ?? "Unexpected error" },
    { status },
  );
}
