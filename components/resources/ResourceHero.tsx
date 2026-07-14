type ResourceHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ResourceHero({ eyebrow, title, description }: ResourceHeroProps) {
  return (
    <header className="relative overflow-hidden px-6 pt-10 pb-16 lg:px-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(139,92,246,0.14), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(34,211,238,0.1), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-4xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-cc-purple uppercase">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-cc-text sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cc-muted">{description}</p>
      </div>
    </header>
  );
}
