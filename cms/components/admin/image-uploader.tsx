"use client";

import { uploadMedia } from "@/app/admin/media-actions";
import { cn } from "@/lib/cn";
import Image from "next/image";
import { useRef, useState } from "react";

export function ImageUploader({
  value,
  onChange,
  onError,
  label = "Card image",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onError?: (msg: string) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function handle(file: File) {
    if (!file.type.startsWith("image/")) {
      onError?.("Only image files are allowed.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      onError?.("Image is too large (max 8MB).");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadMedia(fd);
    setBusy(false);
    if (res.ok && res.url) onChange(res.url);
    else onError?.(res.error ?? "Upload failed.");
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink-muted">{label}</span>
      {value ? (
        <div className="relative overflow-hidden rounded-[--radius-lg] border border-border">
          <Image
            src={value}
            alt=""
            width={800}
            height={480}
            className="h-48 w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-[--radius-sm] bg-bg/80 px-2.5 py-1 text-xs text-ink backdrop-blur hover:bg-bg"
          >
            Remove
          </button>
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
            if (f) handle(f);
          }}
          className={cn(
            "grid h-40 place-items-center rounded-[--radius-lg] border border-dashed text-sm transition-colors",
            drag
              ? "border-accent bg-accent/10 text-ink"
              : "border-border bg-surface text-ink-faint hover:border-border-strong",
          )}
        >
          {busy ? "Uploading…" : "Drag an image here, or click to browse"}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
