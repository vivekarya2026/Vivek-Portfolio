import { getInquiryById, updateInquiryStatus } from "@/lib/data/inquiries";
import { EditorTopbar } from "@/components/admin/editor-chrome";
import { formatDate } from "@/lib/format";
import { notFound } from "next/navigation";
import type { ContactSubmission } from "@/lib/types";
import { InquiryDetail } from "./inquiry-detail";

export const dynamic = "force-dynamic";

export default async function InquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiryById(id);
  if (!inquiry) notFound();

  // Mark as read when opened (best-effort).
  if (inquiry.status === "new") {
    await updateInquiryStatus(id, "read");
    inquiry.status = "read";
  }

  const name = [inquiry.first_name, inquiry.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <EditorTopbar backHref="/admin/inquiries" backLabel="Inquiries">
        <span className="text-sm text-ink-muted">
          {name || "Inquiry"} · {formatDate(inquiry.created_at)}
        </span>
      </EditorTopbar>
      <InquiryDetail inquiry={inquiry as ContactSubmission} />
    </>
  );
}
