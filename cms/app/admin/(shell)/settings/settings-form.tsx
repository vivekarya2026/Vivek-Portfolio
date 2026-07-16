"use client";

import { uploadResume } from "@/app/admin/media-actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useRef, useState, useTransition } from "react";
import { saveResumeUrl } from "./actions";

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
        notify("Settings saved. Run “npm run build:site” to publish.");
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
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Resume</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Upload a PDF; every “Resume” link across the site points to it after
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
