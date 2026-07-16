import Link from "next/link";

export function EditorTopbar({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-[--z-sticky] flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg/80 px-5 py-4 backdrop-blur sm:px-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <span aria-hidden>←</span>
        {backLabel}
      </Link>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function EditorBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">{children}</div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
      {children}
    </h2>
  );
}
