export function CollectionHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-[--z-sticky] flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg/80 px-5 py-4 backdrop-blur sm:px-8">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {typeof count === "number" && (
          <span className="text-sm text-ink-faint">{count} items</span>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <p className="text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-5 sm:p-8" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 w-full rounded-[--radius-md]" />
      ))}
    </div>
  );
}
