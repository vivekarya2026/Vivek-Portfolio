import {
  CollectionHeader,
  EmptyState,
} from "@/components/admin/collection-chrome";
import { listInquiries } from "@/lib/data/inquiries";
import type { ContactSubmission } from "@/lib/types";
import { InquiriesList } from "./inquiries-list";

export const metadata = { title: "Inquiries - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  let inquiries: ContactSubmission[] = [];
  let errorMsg: string | null = null;

  try {
    inquiries = await listInquiries();
  } catch (err) {
    errorMsg = (err as Error).message;
    console.error("inquiries list failed:", errorMsg);
  }

  if (errorMsg) {
    return (
      <>
        <CollectionHeader title="Inquiries" />
        <EmptyState title="Couldn't load inquiries" description={errorMsg} />
      </>
    );
  }

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
