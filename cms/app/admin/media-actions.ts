"use server";

import { createAdminClient } from "@/lib/appwrite/admin";
import { APPWRITE_BUCKET_ID } from "@/lib/appwrite/config";
import { ID } from "node-appwrite";

export type UploadResult = { ok: boolean; url?: string; error?: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

/** Returns the public view URL for an Appwrite Storage file. */
function getPublicUrl(fileId: string): string {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  return `${endpoint}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
}

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

  try {
    const { storage } = createAdminClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileId = ID.unique();
    // Use a filename that encodes the year prefix for organisation.
    const year = new Date().getFullYear();
    const fileName = `${year}_${crypto.randomUUID()}.${ext}`;

    await storage.createFile(
      APPWRITE_BUCKET_ID,
      fileId,
      new File([file], fileName, { type: file.type }),
    );

    return { ok: true, url: getPublicUrl(fileId) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
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

  try {
    const { storage } = createAdminClient();
    const fileId = ID.unique();
    const fileName = `resume_${crypto.randomUUID()}.pdf`;

    await storage.createFile(
      APPWRITE_BUCKET_ID,
      fileId,
      new File([file], fileName, { type: "application/pdf" }),
    );

    return { ok: true, url: getPublicUrl(fileId) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
