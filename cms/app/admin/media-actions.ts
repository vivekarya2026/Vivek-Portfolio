"use server";

import { createClient } from "@/lib/supabase/server";

export type UploadResult = { ok: boolean; url?: string; error?: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Only image files are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image is too large (max 8MB)." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);

  return { ok: true, url: publicUrl };
}

export async function uploadResume(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { ok: false, error: "Only PDF files are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "PDF is too large (max 8MB)." };
  }

  const supabase = await createClient();
  const path = `resume/${crypto.randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: "application/pdf", upsert: false });

  if (error) return { ok: false, error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("media").getPublicUrl(path);

  return { ok: true, url: publicUrl };
}
