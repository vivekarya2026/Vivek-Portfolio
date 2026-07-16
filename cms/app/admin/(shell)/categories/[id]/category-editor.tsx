"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  EditorBody,
  EditorTopbar,
} from "@/components/admin/editor-chrome";
import { slugify } from "@/lib/slug";
import type { Category } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCategory, saveCategory } from "../actions";

export function CategoryEditor({ category }: { category: Category }) {
  const router = useRouter();
  const { notify } = useToast();
  const [name, setName] = useState(category.name);
  const [published, setPublished] = useState(category.published);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  function onSave() {
    startSave(async () => {
      const fd = new FormData();
      fd.set("id", category.id);
      fd.set("name", name);
      if (published) fd.set("published", "on");
      const res = await saveCategory(fd);
      if (res.ok) {
        notify("Category saved");
        router.refresh();
      } else {
        notify(res.error ?? "Couldn't save", "error");
      }
    });
  }

  function onDelete() {
    if (!confirm("Delete this category? This can't be undone.")) return;
    startDelete(async () => {
      const res = await deleteCategory(category.id);
      if (res.ok) {
        notify("Category deleted");
        router.push("/admin/categories");
      } else {
        notify(res.error ?? "Couldn't delete", "error");
      }
    });
  }

  return (
    <>
      <EditorTopbar backHref="/admin/categories" backLabel="Project Categories">
        <Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
          Delete
        </Button>
        <Button size="sm" loading={saving} onClick={onSave}>
          Save
        </Button>
      </EditorTopbar>

      <EditorBody>
        <div className="flex flex-col gap-6">
          <Field label="Name" htmlFor="cat-name">
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Design"
            />
          </Field>

          <Field label="Slug" hint="Generated from the name.">
            <Input value={slugify(name) || "—"} readOnly disabled />
          </Field>

          <div className="flex items-center justify-between rounded-[--radius-md] border border-border bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-medium">Published</p>
              <p className="text-xs text-ink-faint">
                Visible for grouping on the public site.
              </p>
            </div>
            <Switch
              checked={published}
              onChange={setPublished}
              label="Published"
            />
          </div>
        </div>
      </EditorBody>
    </>
  );
}
