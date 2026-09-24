/**
 * Server-side Appwrite session client.
 * Reads the session secret from the cookie to act as the logged-in admin.
 * Use in Server Components and Server Actions that need the authenticated user.
 */
import { Client, Account, Databases, Storage } from "node-appwrite";
import { cookies } from "next/headers";

const SESSION_COOKIE = "appwrite-session";

async function createSessionClient() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  const client = new Client()
    .setEndpoint(
      process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1",
    )
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  if (session) {
    client.setSession(session);
  }

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

export { createSessionClient, SESSION_COOKIE };
