"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";

const collections = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/blog", label: "Blog Posts" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/collections", label: "Custom Collections" },
  { href: "/admin/categories", label: "Categories" },
];

const workspace = [{ href: "/admin/settings", label: "Settings" }];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <span className="font-semibold">Portfolio CMS</span>
        <button
          className="min-h-11 min-w-11 rounded-[--radius-md] px-3 text-sm text-ink-muted hover:bg-surface-2"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {/* Collections rail */}
      <aside
        className={cn(
          "shrink-0 border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r",
          mobileOpen ? "block border-b" : "hidden lg:flex",
        )}
      >
        <div className="hidden px-5 py-5 lg:block">
          <span className="text-sm font-semibold tracking-tight">
            Portfolio CMS
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Collections
          </p>
          {collections.map((c) => {
            const active = pathname.startsWith(c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-[--radius-md] px-3 py-2.5 text-sm transition-colors duration-[--dur-fast]",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                {c.label}
              </Link>
            );
          })}
          <p className="px-3 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-ink-faint">
            Workspace
          </p>
          {workspace.map((c) => {
            const active = pathname.startsWith(c.href);
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-[--radius-md] px-3 py-2.5 text-sm transition-colors duration-[--dur-fast]",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
          <p className="truncate text-xs text-ink-faint" title={email}>
            {email}
          </p>
          <form action={signOut}>
            <Button variant="secondary" size="sm" className="w-full" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
