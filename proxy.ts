import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// This is a coarse, UX-friendly first gate only — it redirects an
// unauthenticated browser away from obviously-authenticated-only pages so
// they don't hit a bare error. It is NOT the source of authorization
// truth: every server component/route handler under these paths (and
// everywhere else) independently re-checks role/institution/account
// status/mustChangePassword against Prisma via lib/auth/authorization.ts,
// since proxy matcher coverage can silently regress on a refactor and
// must never be the only thing standing between a request and protected
// data. See docs/behavior/security-invariants.md #7/#8.
const isProtectedRoute = createRouteMatcher([
  "/first-login",
  "/institution/dashboard(.*)",
  "/institution/users(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
