import {
  CollectionHeader,
  EmptyState,
} from "@/components/admin/collection-chrome";
import { createClient } from "@/lib/supabase/server";
import type { ContactSubmission } from "@/lib/types";
import { InquiriesList } from "./inquiries-list";

export const metadata = { title: "Inquiries - Portfolio CMS" };
export const dynamic = "force-dynamic";

function isMissingTable(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("contact_submissions") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("Could not find the table"))
  );
}

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error && isMissingTable(error.message)) {
    return (
      <>
        <CollectionHeader title="Inquiries" />
        <EmptyState
          title="Setup required"
          description="Run supabase/migrations/0004_contact_submissions.sql in the Supabase SQL Editor (that file only — do not re-run 0001_init.sql). Then refresh this page."
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <CollectionHeader title="Inquiries" />
        <EmptyState
          title="Couldn't load inquiries"
          description={error.message}
        />
      </>
    );
  }

  const inquiries = (data ?? []) as ContactSubmission[];
  const unread = inquiries.filter((i) => i.status === "new").length;

  return (
    <>
      <CollectionHeader title="Inquiries" count={inquiries.length}>
        {unread > 0 ? (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
            {unread} new
          </span>
        ) : null}
      </CollectionHeader>
      {inquiries.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          description="When someone fills out the contact form on your portfolio, their message will show up here and land in your inbox."
        />
      ) : (
        <InquiriesList inquiries={inquiries} />
      )}
    </>
  );
}
