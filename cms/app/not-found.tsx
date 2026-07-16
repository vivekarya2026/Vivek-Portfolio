import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-5">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-ink-faint">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          This page moved or never existed.
        </h1>
        <p className="text-ink-muted">
          The page you&rsquo;re looking for isn&rsquo;t here.
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/admin"
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Go to CMS
          </Link>
        </div>
      </div>
    </main>
  );
}
