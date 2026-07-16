"use client";

import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  href,
  searchable,
  searchPlaceholder = "Search…",
  filterFn,
  onDelete,
  deleteLabel = "Delete",
}: {
  rows: T[];
  columns: Column<T>[];
  href: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterFn?: (row: T, query: string) => boolean;
  onDelete?: (row: T) => void;
  deleteLabel?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim() || !filterFn) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => filterFn(r, q));
  }, [rows, query, filterFn]);

  return (
    <div className="p-5 sm:p-8">
      {searchable && (
        <div className="mb-4 max-w-sm">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
          />
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[--radius-lg] border border-border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 font-medium text-ink-muted"
                >
                  {c.header}
                </th>
              ))}
              {onDelete && <th className="w-px px-4 py-3" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className="group border-b border-border last:border-b-0 transition-colors duration-[--dur-fast] hover:bg-surface"
              >
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-4 py-3", c.className)}>
                    {i === 0 ? (
                      <Link
                        href={href(row)}
                        className="block font-medium text-ink hover:text-accent"
                      >
                        {c.render(row)}
                      </Link>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
                {onDelete && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="rounded-[--radius-md] px-2.5 py-1.5 text-xs font-medium text-danger opacity-0 transition-opacity duration-[--dur-fast] hover:bg-danger/10 focus:opacity-100 group-hover:opacity-100"
                    >
                      {deleteLabel}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((row) => (
          <div
            key={row.id}
            className="rounded-[--radius-lg] border border-border bg-surface transition-transform duration-[--dur-normal] active:scale-[0.99]"
          >
            <Link
              href={href(row)}
              className="flex flex-col gap-2 p-4"
            >
              {columns.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-wide text-ink-faint">
                    {c.header}
                  </span>
                  <span className="text-sm text-ink">{c.render(row)}</span>
                </div>
              ))}
            </Link>
            {onDelete && (
              <div className="flex justify-end border-t border-border px-4 py-2">
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="rounded-[--radius-md] px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                >
                  {deleteLabel}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-ink-faint">
          No matches for “{query}”.
        </p>
      )}
    </div>
  );
}
