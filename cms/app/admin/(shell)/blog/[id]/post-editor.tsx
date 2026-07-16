"use client";

import { BlockEditor } from "@/components/admin/block-editor";
import {
  EditorBody,
  EditorTopbar,
  SectionTitle,
} from "@/components/admin/editor-chrome";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/slug";
import type { JSONContent, Post } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deletePost,
  publishPost,
  savePost,
  unpublishPost,
  type PostInput,
} from "../actions";

export function PostEditor({ post }: { post: Post }) {
  const router = useRouter();
  const { notify } = useToast();

  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt ?? "");
  const [cover, setCover] = useState<string | null>(post.cover_image_url);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [body, setBody] = useState<JSONContent | null>(post.body);
  const [status, setStatus] = useState(post.status);
  const [dirty, setDirty] = useState(false);

  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [deleting, startDelete] = useTransition();

  const collect = useCallback(
    (): PostInput => ({
      id: post.id,
      title,
      excerpt: excerpt || null,
      cover_image_url: cover,
      body,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }),
    [post.id, title, excerpt, cover, body, tags],
  );

  const doSave = useCallback(
    (opts?: { silent?: boolean }) =>
      new Promise<boolean>((resolve) => {
        startSave(async () => {
          const res = await savePost(collect());
          if (res.ok) {
            setDirty(false);
            if (!opts?.silent) notify("Saved");
            router.refresh();
            resolve(true);
          } else {
            notify(res.error ?? "Couldn't save", "error");
            resolve(false);
          }
        });
      }),
    [collect, notify, router],
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave({ silent: true }), 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [dirty, doSave]);

  function onPublish() {
    startPublish(async () => {
      const saved = await doSave({ silent: true });
      if (!saved) return;
      const res = await publishPost(post.id);
      if (res.ok) {
        setStatus("published");
        notify("Published — live now");
        router.refresh();
      } else notify(res.error ?? "Couldn't publish", "error");
    });
  }

  function onUnpublish() {
    startPublish(async () => {
      const res = await unpublishPost(post.id);
      if (res.ok) {
        setStatus("draft");
        notify("Unpublished");
        router.refresh();
      } else notify(res.error ?? "Couldn't unpublish", "error");
    });
  }

  function onDelete() {
    if (!confirm("Delete this post? This can't be undone.")) return;
    startDelete(async () => {
      const res = await deletePost(post.id);
      if (res.ok) {
        notify("Post deleted");
        router.push("/admin/blog");
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <>
      <EditorTopbar backHref="/admin/blog" backLabel="Blog Posts">
        <StatusPill status={status} />
        {dirty && <span className="text-xs text-ink-faint">Unsaved…</span>}
        <a
          href={`/blog/${slugify(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-sm text-ink-muted hover:text-ink sm:inline"
        >
          Preview
        </a>
        <Button variant="ghost" size="sm" loading={saving} onClick={() => doSave()}>
          Save
        </Button>
        {status === "published" ? (
          <Button
            variant="secondary"
            size="sm"
            loading={publishing}
            onClick={onUnpublish}
          >
            Unpublish
          </Button>
        ) : (
          <Button size="sm" loading={publishing} onClick={onPublish}>
            Publish
          </Button>
        )}
        <Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
          Delete
        </Button>
      </EditorTopbar>

      <EditorBody>
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-5">
            <SectionTitle>Post</SectionTitle>
            <Field label="Title" htmlFor="b-title">
              <Input
                id="b-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                placeholder="Post title"
              />
            </Field>
            <Field label="Slug" hint="Generated from the title.">
              <Input value={slugify(title) || "—"} readOnly disabled />
            </Field>
            <Field label="Excerpt" htmlFor="b-ex" hint="Shown in the blog list.">
              <Textarea
                id="b-ex"
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
            <Field label="Tags" htmlFor="b-tags" hint="Comma-separated.">
              <Input
                id="b-tags"
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  setDirty(true);
                }}
                placeholder="design, process, tools"
              />
            </Field>
          </section>

          <section className="flex flex-col gap-5">
            <SectionTitle>Cover</SectionTitle>
            <ImageUploader
              label="Cover image"
              value={cover}
              onChange={(url) => {
                setCover(url);
                setDirty(true);
              }}
              onError={(m) => notify(m, "error")}
            />
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>Content</SectionTitle>
            <BlockEditor
              value={body}
              onChange={(doc) => {
                setBody(doc);
                setDirty(true);
              }}
              onUploadError={(m) => notify(m, "error")}
            />
          </section>
        </div>
      </EditorBody>
    </>
  );
}
