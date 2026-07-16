"use client";

import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { ProjectWithCategory } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteProject, reorderProjects } from "./actions";

export function ProjectsList({
  projects,
}: {
  projects: ProjectWithCategory[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [, startDelete] = useTransition();
  const [, startReorder] = useTransition();

  const [order, setOrder] = useState(projects);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Keep local order in sync when the server data changes (e.g. after refresh).
  const serverIds = projects.map((p) => p.id).join(",");
  const [lastServerIds, setLastServerIds] = useState(serverIds);
  if (serverIds !== lastServerIds) {
    setLastServerIds(serverIds);
    setOrder(projects);
  }

  const searching = query.trim().length > 0;
  const filtered = useMemo(() => {
    if (!searching) return order;
    const q = query.toLowerCase();
    return order.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.company_name ?? "").toLowerCase().includes(q),
    );
  }, [order, query, searching]);

  function persist(next: ProjectWithCategory[]) {
    setOrder(next);
    startReorder(async () => {
      const res = await reorderProjects(next.map((p) => p.id));
      if (!res.ok) {
        notify(res.error ?? "Couldn't save order", "error");
        router.refresh();
      }
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const next = [...order];
    const from = next.findIndex((p) => p.id === dragId);
    const to = next.findIndex((p) => p.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    setOverId(null);
    persist(next);
  }

  function onDelete(p: ProjectWithCategory) {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    startDelete(async () => {
      const res = await deleteProject(p.id);
      if (res.ok) {
        setOrder((cur) => cur.filter((x) => x.id !== p.id));
        notify("Project deleted");
        router.refresh();
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm flex-1">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
          />
        </div>
        <p className="text-xs text-ink-faint">
          Drag rows to set priority (top = shown first).
        </p>
      </div>

      {searching && (
        <p className="mb-3 text-xs text-ink-faint">
          Reordering is disabled while searching.
        </p>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[--radius-lg] border border-border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className="w-10 px-2 py-3" aria-label="Reorder" />
              <th className="px-4 py-3 font-medium text-ink-muted">Name</th>
              <th className="px-4 py-3 font-medium text-ink-muted">Category</th>
              <th className="px-4 py-3 font-medium text-ink-muted">Featured</th>
              <th className="px-4 py-3 font-medium text-ink-muted">Status</th>
              <th className="px-4 py-3 font-medium text-ink-muted">Modified</th>
              <th className="w-px px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                draggable={!searching}
                onDragStart={() => setDragId(p.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={(e) => {
                  if (!dragId || searching) return;
                  e.preventDefault();
                  if (overId !== p.id) setOverId(p.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(p.id);
                }}
                className={cn(
                  "group border-b border-border last:border-b-0 transition-colors duration-[--dur-fast] hover:bg-surface",
                  dragId === p.id && "opacity-50",
                  overId === p.id && dragId !== p.id && "bg-accent/5",
                )}
              >
                <td className="px-2 py-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-[--radius-md] text-ink-faint",
                      searching
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-grab hover:bg-surface-2 hover:text-ink active:cursor-grabbing",
                    )}
                    aria-hidden="true"
                    title={searching ? "Clear search to reorder" : "Drag to reorder"}
                  >
                    ⠿
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="block font-medium text-ink hover:text-accent"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-ink-muted">
                    {p.categories?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.featured ? (
                    <span className="text-accent">★</span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-ink-muted">
                    {formatDate(p.updated_at)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="rounded-[--radius-md] px-2.5 py-1.5 text-xs font-medium text-danger opacity-0 transition-opacity duration-[--dur-fast] hover:bg-danger/10 focus:opacity-100 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-[--radius-lg] border border-border bg-surface"
          >
            <Link
              href={`/admin/projects/${p.id}`}
              className="flex flex-col gap-2 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">{p.title}</span>
                <StatusPill status={p.status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-ink-faint">
                  Category
                </span>
                <span className="text-sm text-ink-muted">
                  {p.categories?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-ink-faint">
                  Featured
                </span>
                <span className="text-sm">
                  {p.featured ? (
                    <span className="text-accent">★</span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </span>
              </div>
            </Link>
            <div className="flex justify-end border-t border-border px-4 py-2">
              <button
                type="button"
                onClick={() => onDelete(p)}
                className="rounded-[--radius-md] px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
              >
                Delete
              </button>
            </div>
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
