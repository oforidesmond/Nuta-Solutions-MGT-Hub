type PlaceholderPageProps = {
  title: string;
  icon: string;
  description: string;
  bullets?: string[];
};

export function PlaceholderPage({ title, icon, description, bullets }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-14 text-center">
        <div className="mb-4 text-4xl opacity-90" aria-hidden>
          {icon}
        </div>
        <h2 className="text-base font-semibold text-foreground">{title} - coming soon</h2>
        {bullets?.length ? (
          <ul className="mt-4 max-w-sm list-inside list-disc space-y-1 text-left text-sm text-muted-foreground">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
