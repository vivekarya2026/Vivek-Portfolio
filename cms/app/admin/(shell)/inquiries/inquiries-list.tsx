"use client";

import { DataTable } from "@/components/admin/data-table";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ContactSubmission, InquiryStatus } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteInquiry } from "./actions";

function InquiryPill({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "new" && "bg-accent/15 text-accent",
        status === "read" && "bg-ink-faint/15 text-ink-muted",
        status === "archived" && "bg-ink-faint/10 text-ink-faint",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "new" && "bg-accent",
          status === "read" && "bg-ink-faint",
          status === "archived" && "bg-ink-faint/60",
        )}
        aria-hidden
      />
      {status === "new" ? "New" : status === "read" ? "Read" : "Archived"}
    </span>
  );
}

export function InquiriesList({
  inquiries,
}: {
  inquiries: ContactSubmission[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [, startDelete] = useTransition();

  function onDelete(row: ContactSubmission) {
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
    if (!confirm(`Delete inquiry from ${name}? This can't be undone.`)) return;
    startDelete(async () => {
      const res = await deleteInquiry(row.id);
      if (res.ok) {
        notify("Inquiry deleted");
        router.refresh();
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <DataTable
      rows={inquiries}
      href={(row) => `/admin/inquiries/${row.id}`}
      searchable
      searchPlaceholder="Search inquiries…"
      onDelete={onDelete}
      filterFn={(row, q) =>
        `${row.first_name} ${row.last_name} ${row.email} ${row.message}`
          .toLowerCase()
          .includes(q)
      }
      columns={[
        {
          key: "from",
          header: "From",
          render: (row) => (
            <span className={row.status === "new" ? "font-medium" : undefined}>
              {[row.first_name, row.last_name].filter(Boolean).join(" ") || "—"}
            </span>
          ),
        },
        {
          key: "email",
          header: "Email",
          render: (row) => (
            <span className="text-ink-muted">{row.email}</span>
          ),
        },
        {
          key: "preview",
          header: "Message",
          render: (row) => (
            <span className="line-clamp-1 text-ink-muted">
              {row.message.slice(0, 80)}
              {row.message.length > 80 ? "…" : ""}
            </span>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => <InquiryPill status={row.status} />,
        },
        {
          key: "received",
          header: "Received",
          render: (row) => (
            <span className="text-ink-muted">{formatDate(row.created_at)}</span>
          ),
        },
      ]}
    />
  );
}
