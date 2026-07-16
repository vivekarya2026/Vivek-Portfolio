"use client";

import { EditorBody, SectionTitle } from "@/components/admin/editor-chrome";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ContactSubmission } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteInquiry, setInquiryStatus } from "../actions";

export function InquiryDetail({ inquiry }: { inquiry: ContactSubmission }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();

  const name = [inquiry.first_name, inquiry.last_name]
    .filter(Boolean)
    .join(" ");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await action();
      if (res.ok) {
        notify(okMsg);
        router.refresh();
      } else notify(res.error ?? "Something went wrong", "error");
    });
  }

  return (
    <EditorBody>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-2">
          {inquiry.status !== "archived" ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => setInquiryStatus(inquiry.id, "archived"), "Archived")
              }
            >
              Archive
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => setInquiryStatus(inquiry.id, "read"), "Restored")
              }
            >
              Unarchive
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this inquiry? This can't be undone.")) return;
              start(async () => {
                const res = await deleteInquiry(inquiry.id);
                if (res.ok) {
                  notify("Inquiry deleted");
                  router.push("/admin/inquiries");
                } else notify(res.error ?? "Couldn't delete", "error");
              });
            }}
          >
            Delete
          </Button>
          <a
            href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: your message`)}`}
            className="inline-flex h-9 items-center rounded-[--radius-md] bg-accent px-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Reply by email
          </a>
        </div>

        <section className="flex flex-col gap-3">
          <SectionTitle>From</SectionTitle>
          <div className="rounded-[--radius-md] border border-border bg-surface px-4 py-3 text-sm">
            <p className="font-medium">{name || "—"}</p>
            <p className="text-ink-muted">
              <a className="hover:text-ink" href={`mailto:${inquiry.email}`}>
                {inquiry.email}
              </a>
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Message</SectionTitle>
          <div className="whitespace-pre-wrap rounded-[--radius-md] border border-border bg-surface px-4 py-4 text-sm leading-relaxed">
            {inquiry.message}
          </div>
        </section>

        <section className="flex flex-col gap-2 text-xs text-ink-faint">
          <p>
            Email delivery:{" "}
            {inquiry.email_sent
              ? "Sent to your inbox"
              : inquiry.email_error
                ? `Failed (${inquiry.email_error})`
                : "Not sent"}
          </p>
          {inquiry.source ? <p>Source: {inquiry.source}</p> : null}
        </section>
      </div>
    </EditorBody>
  );
}
