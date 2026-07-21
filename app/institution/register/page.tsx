import type { Metadata } from "next";
import { InstitutionRegisterForm } from "@/components/institution/institution-register-form";

export const metadata: Metadata = {
  title: "Register Your Facility | CaseCompass AI",
};

export default function InstitutionRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cc-bg px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-cc-text">Register Your Facility</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-cc-muted">
          Set up a CaseCompass account for your correctional facility, reentry program, or partner organization.
        </p>
      </div>
      <div className="glass-card w-full max-w-lg rounded-2xl p-6">
        <InstitutionRegisterForm />
      </div>
    </div>
  );
}
