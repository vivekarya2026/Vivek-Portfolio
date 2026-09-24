/**
 * Browser-side Appwrite client.
 * Uses the public project ID — no secret keys.
 */
import { Client, Account } from "appwrite";

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    _client = new Client()
      .setEndpoint(
        process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
          "https://cloud.appwrite.io/v1",
      )
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
  }
  return _client;
}

function getAccount(): Account {
  return new Account(getClient());
}

export { getClient, getAccount };
