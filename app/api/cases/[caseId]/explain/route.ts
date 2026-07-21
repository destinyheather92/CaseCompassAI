import { NextResponse, type NextRequest } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";
import { explainCase } from "@/lib/case-explainer/explain-case";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    const failure = authorizationFailureResponse(authResult.reason);
    return NextResponse.json(failure.body, { status: failure.status });
  }

  const { caseId } = await context.params;
  const result = await explainCase(caseId);

  if (result.status === "not-found") {
    return NextResponse.json({ status: "not-found" }, { status: 404 });
  }

  if (result.status === "explanation-unavailable") {
    return NextResponse.json(
      {
        status: "explanation-unavailable",
        caseResult: result.caseResult,
        opinionText: result.opinionText,
        message: result.message,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      caseResult: result.caseResult,
      explanation: result.explanation,
      opinionText: result.opinionText,
    },
    { status: 200 },
  );
}
