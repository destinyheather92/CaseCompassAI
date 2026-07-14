import type { ReactNode } from "react";

type ResourceSectionProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ResourceSection({ id, title, description, children, className }: ResourceSectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 px-6 py-12 lg:px-10 ${className ?? ""}`}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-extrabold tracking-tight text-cc-text sm:text-3xl">{title}</h2>
        <div className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-cc-purple to-cc-teal" />
        {description && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-cc-muted">{description}</p>
        )}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
