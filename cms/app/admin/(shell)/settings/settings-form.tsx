"use client";

import { uploadResume } from "@/app/admin/media-actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useRef, useState, useTransition } from "react";
import { saveResumeUrl } from "./actions";

const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "";

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

export function SettingsForm({
  initialResumeUrl,
}: {
  initialResumeUrl: string | null;
}) {
  const { notify } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(initialResumeUrl);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [saving, startSave] = useTransition();

  // ── Passkey registration state ────────────────────────────────────────────
  const [passkeyStatus, setPasskeyStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);

  async function registerPasskey() {
    if (!window.PublicKeyCredential) {
      setPasskeyMessage("Your browser doesn't support passkeys/biometrics.");
      setPasskeyStatus("error");
      return;
    }
    setPasskeyStatus("loading");
    setPasskeyMessage(null);

    try {
      // 1. Get creation options from Appwrite (authenticated — uses session cookie)
      const optRes = await fetch(`${ENDPOINT}/account/webauthn/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": PROJECT_ID,
          "X-SDK-Name": "Web",
        },
        credentials: "include", // sends the session cookie
      });

      if (!optRes.ok) {
        const err = await optRes.json().catch(() => ({}));
        throw new Error(err.message ?? `Server error ${optRes.status}`);
      }

      const options = await optRes.json();

      // 2. Browser biometric/passkey registration prompt
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: base64urlToBuffer(options.challenge),
          rp: { id: options.rp?.id, name: options.rp?.name ?? "Portfolio CMS" },
          user: {
            id: base64urlToBuffer(options.user?.id ?? btoa("admin")),
            name: options.user?.name ?? "admin",
            displayName: options.user?.displayName ?? "Vivek Arya",
          },
          pubKeyCredParams: options.pubKeyCredParams ?? [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          timeout: options.timeout ?? 60000,
          attestation: options.attestation ?? "none",
          authenticatorSelection: options.authenticatorSelection ?? {
            userVerification: "preferred",
            residentKey: "preferred",
          },
          excludeCredentials: (options.excludeCredentials ?? []).map(
            (c: { id: string; type: string }) => ({
              id: base64urlToBuffer(c.id),
              type: c.type,
            }),
          ),
        },
      });

      if (!credential || !(credential instanceof PublicKeyCredential)) {
        throw new Error("No credential returned.");
      }

      const response = credential.response as AuthenticatorAttestationResponse;

      // 3. Complete registration with Appwrite
      const verRes = await fetch(`${ENDPOINT}/account/webauthn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": PROJECT_ID,
          "X-SDK-Name": "Web",
        },
        credentials: "include",
        body: JSON.stringify({
          id: credential.id,
          rawId: bufferToBase64url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: bufferToBase64url(response.clientDataJSON),
            attestationObject: bufferToBase64url(response.attestationObject),
          },
        }),
      });

      if (!verRes.ok) {
        const err = await verRes.json().catch(() => ({}));
        throw new Error(err.message ?? "Registration verification failed.");
      }

      setPasskeyStatus("success");
      setPasskeyMessage(
        "Fingerprint registered! You can now sign in with your fingerprint.",
      );
    } catch (err: unknown) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "AbortError")
      ) {
        setPasskeyStatus("idle");
        setPasskeyMessage(null);
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setPasskeyStatus("error");
      setPasskeyMessage(
        msg.includes("already")
          ? "A passkey for this device already exists."
          : "Couldn't register fingerprint — " + msg,
      );
    }
  }

  async function handleFile(file: File) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      notify("Only PDF files are allowed.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify("PDF is too large (max 8MB).", "error");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadResume(fd);
    setUploading(false);
    if (res.ok && res.url) {
      setResumeUrl(res.url);
      notify("Resume uploaded. Don't forget to Save.");
    } else {
      notify(res.error ?? "Upload failed.", "error");
    }
  }

  function onSave() {
    startSave(async () => {
      const res = await saveResumeUrl(resumeUrl);
      if (res.ok) {
        notify('Settings saved. Run "npm run build:site" to publish.');
      } else {
        notify(res.error ?? "Couldn't save", "error");
      }
    });
  }

  const fileName = resumeUrl
    ? decodeURIComponent(resumeUrl.split("/").pop() ?? "resume.pdf")
    : null;

  return (
    <div className="flex flex-col gap-8">
      {/* ── Fingerprint / Passkey ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Fingerprint login</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Register your fingerprint (or Face ID / Windows Hello) on this
            device so you can sign in without a password.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-[--radius-lg] border border-border bg-surface p-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              passkeyStatus === "success"
                ? "border-emerald-500 bg-emerald-500/10"
                : passkeyStatus === "error"
                  ? "border-red-500 bg-red-500/10"
                  : "border-border bg-background",
            )}
          >
            {passkeyStatus === "loading" ? (
              <svg
                className="h-6 w-6 animate-spin text-accent"
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
              <FingerprintIcon
                className={cn(
                  "h-7 w-7",
                  passkeyStatus === "success"
                    ? "text-emerald-500"
                    : passkeyStatus === "error"
                      ? "text-red-500"
                      : "text-ink-muted",
                )}
              />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-ink">
              {passkeyStatus === "success"
                ? "Fingerprint registered ✓"
                : passkeyStatus === "error"
                  ? "Registration failed"
                  : "Register this device"}
            </p>
            <p className="text-xs text-ink-faint">
              {passkeyMessage ??
                "Uses Touch ID, Face ID, or Windows Hello on this device."}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={passkeyStatus === "loading"}
            onClick={registerPasskey}
            className="shrink-0"
          >
            {passkeyStatus === "success" ? "Register again" : "Register"}
          </Button>
        </div>
      </section>

      {/* ── Resume ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Resume</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Upload a PDF; every "Resume" link across the site points to it after
            you run <code className="text-ink">npm run build:site</code>.
          </p>
        </div>

        <Field label="Resume PDF">
          <div className="flex flex-col gap-3">
            {resumeUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-border bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {fileName}
                  </p>
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    View current PDF
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={uploading}
                    onClick={() => ref.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setResumeUrl(null)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => ref.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className={cn(
                  "grid h-28 place-items-center rounded-[--radius-lg] border border-dashed text-sm transition-colors",
                  drag
                    ? "border-accent bg-accent/10 text-ink"
                    : "border-border bg-surface text-ink-faint hover:border-border-strong",
                )}
              >
                {uploading
                  ? "Uploading…"
                  : "Drag a PDF here, or click to browse"}
              </button>
            )}

            <input
              ref={ref}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </Field>

        <Field
          label="Resume URL"
          hint="Set automatically when you upload, or paste a link directly."
        >
          <Input
            value={resumeUrl ?? ""}
            onChange={(e) => setResumeUrl(e.target.value || null)}
            placeholder="https://…/resume.pdf"
          />
        </Field>
      </section>

      <div className="flex justify-end">
        <Button loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

