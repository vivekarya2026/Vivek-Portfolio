/**
 * Server-only Appwrite admin client using API key.
 * Bypasses session auth — equivalent to Supabase service-role client.
 * Import only in Server Components, Server Actions, API routes, and scripts.
 */
import { Client, Databases, Storage, Users } from "node-appwrite";

function createAdminClient() {
  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1",
    )
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  };
}

export { createAdminClient };
