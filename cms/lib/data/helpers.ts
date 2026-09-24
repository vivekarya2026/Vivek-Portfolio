/**
 * Shared helpers for mapping Appwrite documents to the app's TS types.
 *
 * Appwrite uses:
 *   $id          → our `id`
 *   $createdAt   → our `created_at`
 *   $updatedAt   → our `updated_at`
 *
 * JSON fields (body, gallery, tags, options, data) are stored as strings and
 * must be parsed on read / serialised on write.
 */

import type { Models } from "node-appwrite";

export type AppwriteDocument = Models.Document;

/** Map Appwrite $id / $createdAt / $updatedAt to snake_case equivalents. */
export function mapMeta(doc: AppwriteDocument) {
  return {
    id: doc.$id,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
  };
}

/** Parse a JSON string field, returning `fallback` on failure. */
export function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialise a value to a JSON string for storage. */
export function toJsonString(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Appwrite SDK listDocuments returns at most 25 docs by default.
 * Fetch all pages recursively so callers get the full dataset.
 */
export async function fetchAll<T extends AppwriteDocument>(
  fetcher: (cursor?: string) => Promise<{ documents: T[]; total: number }>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await fetcher(cursor);
    all.push(...page.documents);
    if (all.length >= page.total || page.documents.length === 0) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }

  return all;
}
