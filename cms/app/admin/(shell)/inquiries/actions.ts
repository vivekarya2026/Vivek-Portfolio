"use server";

import {
  updateInquiryStatus,
  deleteInquiry as deleteInquiryDoc,
} from "@/lib/data/inquiries";
import { revalidatePath } from "next/cache";
import type { InquiryStatus } from "@/lib/types";

export type ActionResult = { ok: boolean; error?: string };

export async function setInquiryStatus(
  id: string,
  status: InquiryStatus,
): Promise<ActionResult> {
  try {
    await updateInquiryStatus(id, status);
    revalidatePath("/admin/inquiries");
    revalidatePath(`/admin/inquiries/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteInquiry(id: string): Promise<ActionResult> {
  try {
    await deleteInquiryDoc(id);
    revalidatePath("/admin/inquiries");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
