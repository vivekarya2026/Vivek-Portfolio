"use client";

import { EditorBody, SectionTitle } from "@/components/admin/editor-chrome";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { FIELD_TYPE_META, fieldTypeLabel } from "@/lib/cms-field-types";
import type { CmsCollection, CmsField, CmsFieldType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  addField,
  deleteCollection,
  deleteField,
  saveCollection,
  updateField,
} from "../../actions";

export function SchemaEditor({
  collection,
  fields: initialFields,
}: {
  collection: CmsCollection;
  fields: CmsField[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(collection.name);
  const [singular, setSingular] = useState(collection.singular_name || "Item");
  const [fields, setFields] = useState(initialFields);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setFields(initialFields);
    setName(collection.name);
    setSingular(collection.singular_name || "Item");
  }, [initialFields, collection.name, collection.singular_name]);

  function saveMeta() {
    start(async () => {
      const res = await saveCollection({
        id: collection.id,
        name,
        singular_name: singular,
      });
      if (res.ok) {
        notify("Collection saved");
        router.refresh();
      } else notify(res.error ?? "Couldn't save", "error");
    });
  }

  function onAddField(type: CmsFieldType) {
    setPickerOpen(false);
    start(async () => {
      const res = await addField({
        collection_id: collection.id,
        name: fieldTypeLabel(type),
        field_type: type,
        options: type === "select" ? ["Option 1", "Option 2"] : [],
      });
      if (res.ok) {
        notify("Field added");
        router.refresh();
      } else notify(res.error ?? "Couldn't add field", "error");
    });
  }

  return (
    <EditorBody>
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <SectionTitle>Collection settings</SectionTitle>
          <Field label="Collection name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Singular name" hint="Used for “New Item” labels.">
            <Input
              value={singular}
              onChange={(e) => setSingular(e.target.value)}
            />
          </Field>
          <p className="text-xs text-ink-faint">
            Collection URL slug:{" "}
            <code className="text-ink-muted">{collection.slug}</code> (auto from
            name)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={pending} onClick={saveMeta}>
              Save settings
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (
                  !confirm(
                    `Delete "${collection.name}" and all of its items?`,
                  )
                )
                  return;
                start(async () => {
                  const res = await deleteCollection(collection.id);
                  if (res.ok) {
                    notify("Collection deleted");
                    router.push("/admin/collections");
                  } else notify(res.error ?? "Couldn't delete", "error");
                });
              }}
            >
              Delete collection
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>Custom fields</SectionTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPickerOpen((v) => !v)}
            >
              {pickerOpen ? "Close" : "Add field"}
            </Button>
          </div>
          <p className="text-sm text-ink-muted">
            Every item always has <strong>Name</strong> and <strong>Slug</strong>
            . Add custom fields below.
          </p>

          {pickerOpen ? (
            <div className="grid grid-cols-2 gap-2 rounded-[--radius-md] border border-border bg-surface p-3 sm:grid-cols-3">
              {FIELD_TYPE_META.map((f) => (
                <button
                  key={f.type}
                  type="button"
                  disabled={pending}
                  onClick={() => onAddField(f.type)}
                  className="rounded-[--radius-md] border border-border px-3 py-3 text-left text-sm transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <div className="font-medium">{f.label}</div>
                  <div className="text-xs text-ink-faint">{f.group}</div>
                </button>
              ))}
            </div>
          ) : null}

          {fields.length === 0 ? (
            <p className="text-sm text-ink-faint">No custom fields yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  pending={pending}
                  onSaved={(next) => {
                    setFields((prev) =>
                      prev.map((f) => (f.id === next.id ? next : f)),
                    );
                    router.refresh();
                  }}
                  onDeleted={() => {
                    setFields((prev) => prev.filter((f) => f.id !== field.id));
                    router.refresh();
                  }}
                  start={start}
                  notify={notify}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </EditorBody>
  );
}

function FieldRow({
  field,
  pending,
  onSaved,
  onDeleted,
  start,
  notify,
}: {
  field: CmsField;
  pending: boolean;
  onSaved: (f: CmsField) => void;
  onDeleted: () => void;
  start: (fn: () => Promise<void>) => void;
  notify: (msg: string, type?: "success" | "error") => void;
}) {
  const [name, setName] = useState(field.name);
  const [required, setRequired] = useState(field.required);
  const [optionsText, setOptionsText] = useState(
    (field.options ?? []).join(", "),
  );

  return (
    <li className="rounded-[--radius-md] border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {fieldTypeLabel(field.field_type)}
        </span>
        <button
          type="button"
          className="text-xs text-danger hover:underline"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Remove field "${field.name}"?`)) return;
            start(async () => {
              const res = await deleteField(field.id, field.collection_id);
              if (res.ok) {
                notify("Field removed");
                onDeleted();
              } else notify(res.error ?? "Couldn't remove", "error");
            });
          }}
        >
          Remove
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <Field label="Field name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">Required</span>
          <Switch
            label="Required"
            checked={required}
            onChange={setRequired}
            disabled={pending}
          />
        </div>
        {field.field_type === "select" ? (
          <Field
            label="Options"
            hint="Comma-separated list (e.g. Draft, Review, Live)"
          >
            <Input
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
            />
          </Field>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          loading={pending}
          onClick={() => {
            start(async () => {
              const options = optionsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const res = await updateField({
                id: field.id,
                collection_id: field.collection_id,
                name,
                required,
                options:
                  field.field_type === "select" ? options : field.options,
              });
              if (res.ok) {
                notify("Field saved");
                onSaved({
                  ...field,
                  name,
                  required,
                  options:
                    field.field_type === "select" ? options : field.options,
                });
              } else notify(res.error ?? "Couldn't save", "error");
            });
          }}
        >
          Save field
        </Button>
      </div>
    </li>
  );
}
