"use client";

import {
  EditorBody,
  EditorTopbar,
  SectionTitle,
} from "@/components/admin/editor-chrome";
import { BlockEditor } from "@/components/admin/block-editor";
import { GalleryUploader } from "@/components/admin/gallery-uploader";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/slug";
import type { Category, JSONContent, Project } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteProject,
  publishProject,
  saveProject,
  unpublishProject,
  type ProjectInput,
} from "../actions";

export function ProjectEditor({
  project,
  categories,
}: {
  project: Project;
  categories: Pick<Category, "id" | "name" | "slug">[];
}) {
  const router = useRouter();
  const { notify } = useToast();

  const [title, setTitle] = useState(project.title);
  const [subtitle, setSubtitle] = useState(project.subtitle ?? "");
  const [company, setCompany] = useState(project.company_name ?? "");
  const [categoryId, setCategoryId] = useState(project.category_id ?? "");
  const [liveLink, setLiveLink] = useState(project.live_link ?? "");
  const [projectDate, setProjectDate] = useState(project.project_date ?? "");
  const [cardImage, setCardImage] = useState<string | null>(
    project.card_image_url,
  );
  const [gallery, setGallery] = useState<string[]>(project.gallery ?? []);
  const [body, setBody] = useState<JSONContent | null>(project.body);
  const [featured, setFeatured] = useState(project.featured);
  const [status, setStatus] = useState(project.status);
  const [dirty, setDirty] = useState(false);

  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [deleting, startDelete] = useTransition();

  const markDirty = () => setDirty(true);

  const collect = useCallback(
    (): ProjectInput => ({
      id: project.id,
      title,
      subtitle: subtitle || null,
      company_name: company || null,
      category_id: categoryId || null,
      live_link: liveLink || null,
      project_date: projectDate || null,
      card_image_url: cardImage,
      gallery,
      body,
      featured,
    }),
    [
      project.id,
      title,
      subtitle,
      company,
      categoryId,
      liveLink,
      projectDate,
      cardImage,
      gallery,
      body,
      featured,
    ],
  );

  const doSave = useCallback(
    (opts?: { silent?: boolean }) =>
      new Promise<boolean>((resolve) => {
        startSave(async () => {
          const res = await saveProject(collect());
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

  // Autosave draft 2s after edits stop.
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
      const res = await publishProject(project.id);
      if (res.ok) {
        setStatus("published");
        notify("Published — live now");
        router.refresh();
      } else notify(res.error ?? "Couldn't publish", "error");
    });
  }

  function onUnpublish() {
    startPublish(async () => {
      const res = await unpublishProject(project.id);
      if (res.ok) {
        setStatus("draft");
        notify("Unpublished");
        router.refresh();
      } else notify(res.error ?? "Couldn't unpublish", "error");
    });
  }

  function onDelete() {
    if (!confirm("Delete this project? This can't be undone.")) return;
    startDelete(async () => {
      const res = await deleteProject(project.id);
      if (res.ok) {
        notify("Project deleted");
        router.push("/admin/projects");
      } else notify(res.error ?? "Couldn't delete", "error");
    });
  }

  return (
    <>
      <EditorTopbar backHref="/admin/projects" backLabel="Projects">
        <StatusPill status={status} />
        {dirty && <span className="text-xs text-ink-faint">Unsaved…</span>}
        <a
          href={`/projects/${slugify(title)}`}
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
            <SectionTitle>Basic info</SectionTitle>
            <Field label="Title" htmlFor="p-title">
              <Input
                id="p-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                placeholder="Project title"
              />
            </Field>
            <Field label="Slug" hint="Generated from the title.">
              <Input value={slugify(title) || "—"} readOnly disabled />
            </Field>
            <Field label="Subtitle / description" htmlFor="p-sub">
              <Textarea
                id="p-sub"
                value={subtitle}
                onChange={(e) => {
                  setSubtitle(e.target.value);
                  markDirty();
                }}
                placeholder="Short summary shown on cards and hero."
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Company" htmlFor="p-co">
                <Input
                  id="p-co"
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    markDirty();
                  }}
                />
              </Field>
              <Field label="Category" htmlFor="p-cat">
                <Select
                  id="p-cat"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    markDirty();
                  }}
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Live link" htmlFor="p-link">
                <Input
                  id="p-link"
                  type="url"
                  value={liveLink}
                  onChange={(e) => {
                    setLiveLink(e.target.value);
                    markDirty();
                  }}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Project date" htmlFor="p-date">
                <Input
                  id="p-date"
                  type="date"
                  value={projectDate}
                  onChange={(e) => {
                    setProjectDate(e.target.value);
                    markDirty();
                  }}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-[--radius-md] border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-ink-faint">
                  Highlight on the home page and works.
                </p>
              </div>
              <Switch
                checked={featured}
                onChange={(v) => {
                  setFeatured(v);
                  markDirty();
                }}
                label="Featured"
              />
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <SectionTitle>Media</SectionTitle>
            <ImageUploader
              value={cardImage}
              onChange={(url) => {
                setCardImage(url);
                markDirty();
              }}
              onError={(m) => notify(m, "error")}
            />
            <GalleryUploader
              value={gallery}
              onChange={(urls) => {
                setGallery(urls);
                markDirty();
              }}
              onError={(m) => notify(m, "error")}
            />
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>Case study body</SectionTitle>
            <BlockEditor
              value={body}
              onChange={(doc) => {
                setBody(doc);
                markDirty();
              }}
              onUploadError={(m) => notify(m, "error")}
            />
          </section>
        </div>
      </EditorBody>
    </>
  );
}
