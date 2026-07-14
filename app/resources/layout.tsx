import { Navbar } from "@/components/site/navbar";
import { TrustFooter } from "@/components/site/trust-footer";

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-cc-bg">
      <Navbar />
      <main className="flex-1">{children}</main>
      <TrustFooter />
    </div>
  );
}
