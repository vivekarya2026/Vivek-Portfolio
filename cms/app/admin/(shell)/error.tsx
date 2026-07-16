"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-ink-muted">
          {error.message || "An unexpected error occurred. Try again."}
        </p>
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
