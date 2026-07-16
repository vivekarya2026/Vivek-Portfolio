"use client";

import { uploadMedia } from "@/app/admin/media-actions";
import { cn } from "@/lib/cn";
import type { JSONContent } from "@/lib/types";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useRef } from "react";

export function BlockEditor({
  value,
  onChange,
  onUploadError,
}: {
  value: JSONContent | null;
  onChange: (doc: JSONContent) => void;
  onUploadError?: (msg: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
      Placeholder.configure({
        placeholder: "Write the case study… headings, lists, images and more.",
      }),
    ],
    content: value ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[50vh] rounded-b-[--radius-lg] border border-t-0 border-border bg-surface px-4 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as JSONContent),
  });

  if (!editor) {
    return <div className="skeleton h-[55vh] w-full rounded-[--radius-lg]" />;
  }

  return (
    <div>
      <Toolbar editor={editor} onUploadError={onUploadError} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  onUploadError,
}: {
  editor: Editor;
  onUploadError?: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const addLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const onPickImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        onUploadError?.("Only image files are allowed.");
        return;
      }
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadMedia(fd);
      if (res.ok && res.url) {
        editor.chain().focus().setImage({ src: res.url }).run();
      } else {
        onUploadError?.(res.error ?? "Upload failed.");
      }
    },
    [editor, onUploadError],
  );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-[--radius-lg] border border-border bg-surface-2 p-2">
      <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
        B
      </Btn>
      <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
        <span className="italic">i</span>
      </Btn>
      <Divider />
      <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2">
        H2
      </Btn>
      <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3">
        H3
      </Btn>
      <Btn active={editor.isActive("heading", { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} label="Heading 4">
        H4
      </Btn>
      <Divider />
      <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
        •
      </Btn>
      <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
        1.
      </Btn>
      <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">
        &ldquo;
      </Btn>
      <Divider />
      <Btn active={editor.isActive("link")} onClick={addLink} label="Link">
        Link
      </Btn>
      <Btn onClick={() => fileRef.current?.click()} label="Insert image">
        Image
      </Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider">
        —
      </Btn>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickImage(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Btn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-[--radius-sm] px-2 text-sm transition-colors duration-[--dur-fast]",
        active
          ? "bg-accent text-accent-ink"
          : "text-ink-muted hover:bg-surface hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}
