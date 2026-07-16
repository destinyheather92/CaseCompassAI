import type { Metadata } from "next";
import { InstitutionLoginForm } from "@/components/auth/institution-login-form";

export const metadata: Metadata = {
  title: "Institution Sign In | CaseCompass AI",
};

export default function InstitutionLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cc-bg px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-cc-text">Institution Sign In</h1>
        <p className="mt-2 text-sm text-cc-muted">Sign in with the account your facility set up for you.</p>
      </div>
      <div className="glass-card w-full max-w-sm rounded-2xl p-6">
        <InstitutionLoginForm />
      </div>
    </div>
  );
}
