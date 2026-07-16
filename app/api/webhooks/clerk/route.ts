import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import { syncIndividualUserFromClerk } from "@/lib/auth/sync-clerk-user";
import { safeLog } from "@/lib/security/safe-logger";

export const runtime = "nodejs";

/**
 * Syncs individual (self-registered) users into the app's authorization
 * database. Institution-managed users get their Prisma row created
 * synchronously by staff (see lib/institution/create-user.ts) — this
 * handler's upsert is a no-op for them if this event arrives afterward.
 *
 * This route must stay excluded from proxy.ts's `auth.protect()` matcher
 * (Clerk can't authenticate itself); signature verification below is
 * what actually secures it.
 */
export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    safeLog("warn", "clerk webhook signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    await syncIndividualUserFromClerk({ clerkUserId: event.data.id });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
