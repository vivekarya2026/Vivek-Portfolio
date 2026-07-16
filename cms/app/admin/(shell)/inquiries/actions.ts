"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { InquiryStatus } from "@/lib/types";

export type ActionResult = { ok: boolean; error?: string };

export async function setInquiryStatus(
  id: string,
  status: InquiryStatus,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_submissions")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
  return { ok: true };
}

export async function deleteInquiry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_submissions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/inquiries");
  return { ok: true };
}
