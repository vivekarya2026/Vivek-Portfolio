import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/admin";
import { createSessionClient } from "@/lib/appwrite/server";
import { APPWRITE_DATABASE_ID, COLLECTION } from "@/lib/appwrite/config";

const DB = APPWRITE_DATABASE_ID;
const COL = COLLECTION.SETTINGS;

export async function getSetting(key: string): Promise<string | null> {
  try {
    const { databases } = createAdminClient();
    const res = await databases.listDocuments(DB, COL, [
      Query.equal("key", key),
      Query.limit(1),
    ]);
    if (res.documents.length === 0) return null;
    return (res.documents[0].value as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function upsertSetting(key: string, value: string | null): Promise<void> {
  const { databases } = await createSessionClient();

  // Check if doc exists by key
  const res = await databases.listDocuments(DB, COL, [
    Query.equal("key", key),
    Query.limit(1),
  ]);

  if (res.documents.length > 0) {
    await databases.updateDocument(DB, COL, res.documents[0].$id, { value });
  } else {
    // Use key as document ID so it's idempotent
    await databases.createDocument(DB, COL, key, { key, value });
  }
}
