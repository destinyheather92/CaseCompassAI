import { NextResponse, type NextRequest } from "next/server";
import { registerInstitutionSchema } from "@/lib/institution/register-institution-schema";
import { registerInstitution } from "@/lib/institution/register-institution";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { clientIdFor } from "@/lib/security/request-identity";

export const runtime = "nodejs";

// Guest-reachable — keyed by IP, not actor id, since there is no
// authenticated actor yet at this point in the flow.
const registerRateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  const clientId = clientIdFor(request);
  if (registerRateLimiter.isLimited(clientId)) {
    return NextResponse.json(
      { status: "rate-limited", message: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request", message: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = registerInstitutionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const result = await registerInstitution(parsed.data);

  if (result.status === "error") {
    return NextResponse.json({ status: "error", message: result.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      status: "registered",
      institutionId: result.institutionId,
      adminUsername: result.adminUsername,
      temporaryPassword: result.temporaryPassword,
    },
    { status: 201 },
  );
}
