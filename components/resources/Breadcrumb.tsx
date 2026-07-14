import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbProps = {
  currentTitle: string;
};

export function Breadcrumb({ currentTitle }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-4xl px-6 pt-28 lg:px-10">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-cc-muted">
        <li>
          <Link
            href="/"
            className="rounded-sm transition-colors hover:text-cc-text outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" strokeWidth={2} />
        </li>
        <li>
          <Link
            href="/#resources"
            className="rounded-sm transition-colors hover:text-cc-text outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
          >
            Resources
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="size-3.5" strokeWidth={2} />
        </li>
        <li aria-current="page" className="font-medium text-cc-text">
          {currentTitle}
        </li>
      </ol>
    </nav>
  );
}
