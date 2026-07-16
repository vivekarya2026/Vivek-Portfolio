"use client";

import { BlockEditor } from "@/components/admin/block-editor";
import { EditorBody, SectionTitle } from "@/components/admin/editor-chrome";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type {
  CmsCollection,
  CmsField,
  CmsItem,
  JSONContent,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteItem, saveItem, setItemStatus } from "../../../actions";

export function ItemEditor({
  collection,
  item,
  fields,
}: {
  collection: CmsCollection;
  item: CmsItem;
  fields: CmsField[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(item.name);
  const [data, setData] = useState<Record<string, unknown>>(item.data ?? {});
  const [status, setStatus] = useState(item.status);

  function setField(slug: string, value: unknown) {
    setData((prev) => ({ ...prev, [slug]: value }));
  }

  function save() {
    start(async () => {
      const res = await saveItem({
        id: item.id,
        collection_id: collection.id,
        name,
        data,
      });
      if (res.ok) {
        notify("Saved");
        router.refresh();
      } else notify(res.error ?? "Couldn't save", "error");
    });
  }

  function togglePublish() {
    const next = status === "published" ? "draft" : "published";
    start(async () => {
      const saved = await saveItem({
        id: item.id,
        collection_id: collection.id,
        name,
        data,
      });
      if (!saved.ok) {
        notify(saved.error ?? "Couldn't save", "error");
        return;
      }
      const res = await setItemStatus(item.id, collection.id, next);
      if (res.ok) {
        setStatus(next);
        notify(next === "published" ? "Published" : "Unpublished");
        router.refresh();
      } else notify(res.error ?? "Couldn't update status", "error");
    });
  }

  return (
    <EditorBody>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button size="sm" loading={pending} onClick={save}>
          Save
        </Button>
        <Button
          size="sm"
          variant="secondary"
          loading={pending}
          onClick={togglePublish}
        >
          {status === "published" ? "Unpublish" : "Publish"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete "${name}"?`)) return;
            start(async () => {
              const res = await deleteItem(item.id, collection.id);
              if (res.ok) {
                notify("Item deleted");
                router.push(`/admin/collections/${collection.id}`);
              } else notify(res.error ?? "Couldn't delete", "error");
            });
          }}
        >
          Delete
        </Button>
        <span className="text-xs text-ink-faint">
          Status: {status} · slug auto from name
        </span>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionTitle>Basic info</SectionTitle>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </section>

        {fields.length > 0 ? (
          <section className="flex flex-col gap-5">
            <SectionTitle>Custom fields</SectionTitle>
            {fields.map((field) => (
              <DynamicField
                key={field.id}
                field={field}
                value={data[field.slug]}
                onChange={(v) => setField(field.slug, v)}
                onError={(msg) => notify(msg, "error")}
              />
            ))}
          </section>
        ) : (
          <p className="text-sm text-ink-muted">
            No custom fields yet.{" "}
            <button
              type="button"
              className="text-accent underline"
              onClick={() =>
                router.push(`/admin/collections/${collection.id}/schema`)
              }
            >
              Add fields
            </button>
          </p>
        )}
      </div>
    </EditorBody>
  );
}

function DynamicField({
  field,
  value,
  onChange,
  onError,
}: {
  field: CmsField;
  value: unknown;
  onChange: (v: unknown) => void;
  onError: (msg: string) => void;
}) {
  const label = field.required ? `${field.name} *` : field.name;

  switch (field.field_type) {
    case "text":
    case "link":
    case "email":
      return (
        <Field label={label}>
          <Input
            type={
              field.field_type === "email"
                ? "email"
                : field.field_type === "link"
                  ? "url"
                  : "text"
            }
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        </Field>
      );
    case "number":
      return (
        <Field label={label}>
          <Input
            type="number"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            required={field.required}
          />
        </Field>
      );
    case "date":
      return (
        <Field label={label}>
          <Input
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        </Field>
      );
    case "switch":
      return (
        <div className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-border px-4 py-3">
          <span className="text-sm">{label}</span>
          <Switch
            label={field.name}
            checked={Boolean(value)}
            onChange={(v) => onChange(v)}
          />
        </div>
      );
    case "select":
      return (
        <Field label={label}>
          <Select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>
      );
    case "image":
      return (
        <Field label={label}>
          <ImageUploader
            label={field.name}
            value={(value as string | null) ?? null}
            onChange={(url) => onChange(url)}
            onError={onError}
          />
        </Field>
      );
    case "richtext":
      return (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{label}</span>
          <BlockEditor
            value={(value as JSONContent | null) ?? null}
            onChange={(doc) => onChange(doc)}
            onUploadError={onError}
          />
        </div>
      );
    default:
      return (
        <Field label={label}>
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
  }
}
