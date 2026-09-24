import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, COLLECTION } from "@/lib/appwrite/config";
import { mapMeta, fetchAll } from "./helpers";
import type { ContactSubmission, InquiryStatus } from "@/lib/types";

const DB = APPWRITE_DATABASE_ID;
const COL = COLLECTION.CONTACT_SUBMISSIONS;

function mapSubmission(doc: Record<string, unknown>): ContactSubmission {
  return {
    ...mapMeta(doc as Parameters<typeof mapMeta>[0]),
    first_name: doc.first_name as string,
    last_name: (doc.last_name as string) ?? "",
    email: doc.email as string,
    message: doc.message as string,
    status: (doc.status as InquiryStatus) ?? "new",
    email_sent: (doc.email_sent as boolean) ?? false,
    email_error: (doc.email_error as string | null) ?? null,
    source: (doc.source as string | null) ?? null,
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function listInquiries(): Promise<ContactSubmission[]> {
  const { databases } = createAdminClient();
  const docs = await fetchAll((cursor) =>
    databases.listDocuments(DB, COL, [
      Query.orderDesc("$createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.limit(100),
    ]),
  );
  return docs.map(mapSubmission as (doc: Record<string, unknown>) => ContactSubmission);
}

export async function getInquiryById(id: string): Promise<ContactSubmission | null> {
  try {
    const { databases } = createAdminClient();
    const doc = await databases.getDocument(DB, COL, id);
    return mapSubmission(doc as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Count submissions from `email` since `since` (ISO string). Rate-limit helper. */
export async function countRecentByEmail(email: string, since: string): Promise<number> {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(DB, COL, [
    Query.equal("email", email),
    Query.greaterThan("$createdAt", since),
    Query.limit(1),
  ]);
  return res.total;
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function createInquiry(data: {
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  email_sent: boolean;
  email_error: string | null;
  source: string;
}): Promise<ContactSubmission> {
  const { databases } = createAdminClient(); // service-level write (no session)
  const doc = await databases.createDocument(DB, COL, "unique()", {
    ...data,
    status: "new",
  });
  return mapSubmission(doc as unknown as Record<string, unknown>);
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.updateDocument(DB, COL, id, { status });
}

export async function deleteInquiry(id: string): Promise<void> {
  const { databases } = await createSessionClient();
  await databases.deleteDocument(DB, COL, id);
}
