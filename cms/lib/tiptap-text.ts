import type { JSONContent } from "@/lib/types";

export function docToPlainText(doc: JSONContent | null): string {
  if (!doc) return "";
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.text) parts.push(node.text);
    node.content?.forEach(walk);
  };
  walk(doc);
  return parts.join(" ");
}
