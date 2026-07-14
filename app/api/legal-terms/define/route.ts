import { NextResponse, type NextRequest } from "next/server";
import { lookupLegalTerm } from "@/lib/legal-sources/legal-term-service";
import { isRateLimited } from "@/lib/legal-sources/rate-limiter";

export const runtime = "nodejs";

function clientIdFor(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const clientId = clientIdFor(request);
  if (isRateLimited(clientId)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "invalid-request", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const result = await lookupLegalTerm(body);

  const statusCode =
    result.status === "found"
      ? 200
      : result.status === "not-found"
        ? 404
        : result.status === "rate-limited"
          ? 429
          : 400;

  return NextResponse.json(result, { status: statusCode });
}
