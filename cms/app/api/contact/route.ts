import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

const MAX_MESSAGE = 5000;
const MAX_NAME = 100;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5;

function corsHeaders(origin: string | null) {
  const allowed = (
    process.env.CONTACT_ALLOWED_ORIGINS ??
    "http://localhost:8080,http://127.0.0.1:8080"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ok =
    origin &&
    (allowed.includes(origin) ||
      allowed.includes("*") ||
      // Allow same-origin CMS previews
      origin === process.env.NEXT_PUBLIC_SITE_URL);

  return {
    "Access-Control-Allow-Origin": ok && origin ? origin : allowed[0] ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot — bots fill this; real users leave it empty.
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ ok: true }, { status: 200, headers });
    }

    const firstName = String(body.first_name ?? "").trim().slice(0, MAX_NAME);
    const lastName = String(body.last_name ?? "").trim().slice(0, MAX_NAME);
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 254);
    const message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE);

    if (!firstName || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Please fill in your name, email, and message." },
        { status: 400, headers },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400, headers },
      );
    }

    const supabase = createAdminClient();

    // Simple rate limit: max N submissions from the same email per hour.
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", since);

    if ((count ?? 0) >= RATE_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many messages from this email. Please try again later.",
        },
        { status: 429, headers },
      );
    }

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const adminEmail =
      process.env.ADMIN_EMAIL ?? "aryavivekiitbhu@gmail.com";
    const fromEmail =
      process.env.CONTACT_FROM_EMAIL ?? "Portfolio Contact <onboarding@resend.dev>";

    let emailSent = false;
    let emailError: string | null = null;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [adminEmail],
          replyTo: email,
          subject: `New portfolio inquiry from ${fullName}`,
          text: [
            `New contact form submission`,
            ``,
            `Name: ${fullName}`,
            `Email: ${email}`,
            `Received: ${new Date().toISOString()}`,
            ``,
            `Message:`,
            message,
            ``,
            `—`,
            `Reply directly to this email to respond to ${firstName}.`,
          ].join("\n"),
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111">
              <h2 style="margin:0 0 12px">New portfolio inquiry</h2>
              <p style="margin:0 0 8px"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
              <p style="margin:0 0 8px"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
              <p style="margin:0 0 16px"><strong>Received:</strong> ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
              <div style="border-left:3px solid #4d65ff;padding:8px 14px;background:#f6f7ff;white-space:pre-wrap">${escapeHtml(message)}</div>
              <p style="margin:16px 0 0;color:#666;font-size:13px">Reply directly to this email to respond to ${escapeHtml(firstName)}.</p>
            </div>
          `,
        });
        if (error) {
          emailError = error.message;
        } else {
          emailSent = true;
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : "Email send failed";
      }
    } else {
      emailError = "RESEND_API_KEY is not configured";
    }

    const { error: insertError } = await supabase
      .from("contact_submissions")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        message,
        status: "new",
        email_sent: emailSent,
        email_error: emailError,
        source: request.headers.get("origin") ?? "unknown",
      });

    if (insertError) {
      console.error("contact insert failed:", insertError.message);
      return NextResponse.json(
        { ok: false, error: "Couldn't save your message. Please try again." },
        { status: 500, headers },
      );
    }

    // Still succeed for the visitor if we saved the row, even if email failed —
    // admin can read it in the CMS. Surface email issues only in logs/CMS.
    if (!emailSent) {
      console.error("contact email failed:", emailError);
    }

    return NextResponse.json({ ok: true }, { status: 200, headers });
  } catch (err) {
    console.error("contact route error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500, headers },
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
