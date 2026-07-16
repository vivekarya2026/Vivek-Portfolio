"use client";

import { uploadMedia } from "@/app/admin/media-actions";
import Image from "next/image";
import { useRef, useState } from "react";

export function GalleryUploader({
  value,
  onChange,
  onError,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  onError?: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList) {
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        onError?.(`${file.name}: only images allowed.`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        onError?.(`${file.name}: too large (max 8MB).`);
        continue;
      }
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadMedia(fd);
      if (res.ok && res.url) added.push(res.url);
      else onError?.(res.error ?? "Upload failed.");
    }
    setBusy(false);
    if (added.length) onChange([...value, ...added]);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-muted">Gallery</span>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-sm text-accent hover:text-accent-hover"
        >
          {busy ? "Uploading…" : "+ Add images"}
        </button>
      </div>

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-[--radius-md] border border-border"
            >
              <Image
                src={url}
                alt=""
                width={400}
                height={300}
                className="h-28 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute right-1.5 top-1.5 rounded-[--radius-sm] bg-bg/80 px-2 py-0.5 text-xs text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[--radius-md] border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-ink-faint">
          No gallery images yet.
        </p>
      )}

      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
