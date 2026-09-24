"use server";

import {
  APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID,
} from "@/lib/appwrite/auth-helpers";
import { SESSION_COOKIE } from "@/lib/appwrite/server";
import { Client, Account, Users } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthState = { error?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/projects");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;

  // Step 1: Verify credentials using Account (no API key) — this validates
  // the email/password pair and tells us if they're correct.
  const clientNoKey = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID);

  const accountNoKey = new Account(clientNoKey);

  try {
    // This validates credentials. The secret it returns may be empty in some
    // Appwrite configs, so we only use it to confirm the password is correct.
    await accountNoKey.createEmailPasswordSession(email, password);
  } catch {
    return { error: "Those credentials didn't work. Try again." };
  }

  // Step 2: Create a proper session secret via the Admin Users API.
  // Users.createSession() always returns a populated secret/JWT.
  const adminClient = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const users = new Users(adminClient);

  let secret: string;
  try {
    const session = await users.createSession("admin");
    secret = session.secret;
    if (!secret) throw new Error("Empty secret");
  } catch (e) {
    console.error("createSession error:", e);
    return { error: "Session creation failed. Try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect(next.startsWith("/admin") ? next : "/admin/projects");
}

/**
 * Called client-side after a successful WebAuthn passkey authentication.
 * Receives the session secret from the browser SDK and stores it as an
 * httpOnly cookie so the proxy can validate it.
 */
export async function setPasskeySession(
  secret: string,
  next: string,
): Promise<{ error?: string }> {
  if (!secret) return { error: "No session secret provided." };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect(next.startsWith("/admin") ? next : "/admin/projects");
}

export async function signOut() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (session) {
    try {
      const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID)
        .setSession(session);
      const account = new Account(client);
      await account.deleteSession("current");
    } catch {
      // Best-effort — clear cookie regardless
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
