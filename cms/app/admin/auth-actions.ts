"use server";

import {
  APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID,
} from "@/lib/appwrite/auth-helpers";
import { SESSION_COOKIE } from "@/lib/appwrite/server";
import { Client, Account } from "node-appwrite";
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

  // Create session via node-appwrite (server-side, so we can grab the secret).
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(NEXT_PUBLIC_APPWRITE_PROJECT_ID);

  const account = new Account(client);

  let secret: string;
  try {
    const session = await account.createEmailPasswordSession(email, password);
    secret = session.secret;
  } catch {
    return { error: "Those credentials didn't work. Try again." };
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
