import { cn } from "@/lib/cn";

export function StatusPill({ status }: { status: "draft" | "published" }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        published
          ? "bg-success/15 text-success"
          : "bg-ink-faint/15 text-ink-muted",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          published ? "bg-success" : "bg-ink-faint",
        )}
        aria-hidden
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}
