"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useActionState, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, setPasskeySession, type AuthState } from "../auth-actions";

const initial: AuthState = {};

const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a base64url string → Uint8Array (for WebAuthn challenge) */
function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Convert ArrayBuffer → base64url string (for sending assertions back) */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ── Fingerprint icon ──────────────────────────────────────────────────────────
function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 17a13.6 13.6 0 0 0 .19-1.83A10 10 0 0 1 12 2" />
      <path d="M20.97 5a21.5 21.5 0 0 1 .28 4.4" />
      <path d="M6.26 18.67a1.5 1.5 0 0 0 .04-.17C6.5 17.3 6.5 16.5 6.5 16a5.5 5.5 0 0 1 11 0c0 .28 0 .5-.02.68" />
      <path d="M9.5 16a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  const next = useSearchParams().get("next") ?? "/admin/projects";
  const router = useRouter();

  const [passkeyState, setPasskeyState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handlePasskeyLogin() {
    if (!window.PublicKeyCredential) {
      setPasskeyError("Your browser doesn't support passkeys/biometrics.");
      setPasskeyState("error");
      return;
    }

    setPasskeyState("loading");
    setPasskeyError(null);

    try {
      // 1. Get assertion options from Appwrite
      const optRes = await fetch(
        `${ENDPOINT}/account/sessions/webauthn/options`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": PROJECT_ID,
            "X-SDK-Name": "Web",
          },
        },
      );

      if (!optRes.ok) {
        const err = await optRes.json().catch(() => ({}));
        // If no passkey registered yet, give a helpful message
        if (optRes.status === 404 || optRes.status === 400) {
          setPasskeyError(
            "No fingerprint registered yet. Sign in with password, then go to Settings → Fingerprint to register.",
          );
          setPasskeyState("error");
          return;
        }
        throw new Error(err.message ?? `Server error ${optRes.status}`);
      }

      const options = await optRes.json();

      // 2. Trigger browser biometric prompt
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: base64urlToBuffer(options.challenge),
          allowCredentials: (options.allowCredentials ?? []).map(
            (c: { id: string; type: string }) => ({
              id: base64urlToBuffer(c.id),
              type: c.type,
            }),
          ),
          timeout: options.timeout ?? 60000,
          userVerification: options.userVerification ?? "preferred",
          rpId: options.rpId,
        },
      });

      if (!assertion || !(assertion instanceof PublicKeyCredential)) {
        throw new Error("No credential returned.");
      }

      const response = assertion.response as AuthenticatorAssertionResponse;

      // 3. Verify assertion with Appwrite → get session secret
      const verifyRes = await fetch(
        `${ENDPOINT}/account/sessions/webauthn`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": PROJECT_ID,
            "X-SDK-Name": "Web",
          },
          body: JSON.stringify({
            id: assertion.id,
            rawId: bufferToBase64url(assertion.rawId),
            type: assertion.type,
            response: {
              clientDataJSON: bufferToBase64url(response.clientDataJSON),
              authenticatorData: bufferToBase64url(response.authenticatorData),
              signature: bufferToBase64url(response.signature),
              userHandle: response.userHandle
                ? bufferToBase64url(response.userHandle)
                : null,
            },
          }),
        },
      );

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.message ?? "Verification failed.");
      }

      const session = await verifyRes.json();
      const secret = session.secret;

      if (!secret) {
        throw new Error("No session secret returned.");
      }

      // 4. Store as httpOnly cookie server-side
      startTransition(async () => {
        await setPasskeySession(secret, next);
        router.push(next.startsWith("/admin") ? next : "/admin/projects");
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      // User cancelled / dismissed the biometric prompt
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "AbortError")
      ) {
        setPasskeyState("idle");
        return;
      }

      setPasskeyError(msg);
      setPasskeyState("error");
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-ink-muted">Manage your portfolio content.</p>
      </div>

      {/* ── Fingerprint button ── */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={passkeyState === "loading"}
          className="group relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-surface transition-all duration-200 hover:border-accent hover:bg-accent/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Sign in with fingerprint"
        >
          {passkeyState === "loading" ? (
            <svg
              className="h-8 w-8 animate-spin text-accent"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            <FingerprintIcon className="h-10 w-10 text-ink-muted transition-colors group-hover:text-accent" />
          )}
        </button>

        <p className="text-sm text-ink-muted">
          {passkeyState === "loading"
            ? "Waiting for biometric…"
            : "Touch to sign in"}
        </p>

        {passkeyError && (
          <p className="max-w-xs text-center text-xs text-red-400">
            {passkeyError}
          </p>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-faint">or use password</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── Email / password form ── */}
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" htmlFor="password" error={state.error}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>

        <Button type="submit" loading={pending}>
          Sign in with password
        </Button>
      </form>
    </div>
  );
}
