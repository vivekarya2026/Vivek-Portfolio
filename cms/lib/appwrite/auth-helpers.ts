/**
 * Shared constants for Appwrite auth — safe to import anywhere, including
 * non-async middleware (proxy.ts).
 */

export const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";

export const NEXT_PUBLIC_APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";
