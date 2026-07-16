import type { CmsFieldType } from "@/lib/types";

export const FIELD_TYPE_META: {
  type: CmsFieldType;
  label: string;
  group: string;
}[] = [
  { type: "text", label: "Plain text", group: "Text" },
  { type: "richtext", label: "Rich text", group: "Text" },
  { type: "image", label: "Image", group: "Media" },
  { type: "link", label: "Link", group: "Communications" },
  { type: "email", label: "Email", group: "Communications" },
  { type: "number", label: "Number", group: "Data" },
  { type: "date", label: "Date", group: "Data" },
  { type: "switch", label: "Switch", group: "Data" },
  { type: "select", label: "Option", group: "Data" },
];

export function fieldTypeLabel(type: CmsFieldType) {
  return FIELD_TYPE_META.find((f) => f.type === type)?.label ?? type;
}
