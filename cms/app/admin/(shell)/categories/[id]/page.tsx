import { getCategoryById } from "@/lib/data/categories";
import { notFound } from "next/navigation";
import type { Category } from "@/lib/types";
import { CategoryEditor } from "./category-editor";

export const dynamic = "force-dynamic";

export default async function CategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();
  return <CategoryEditor category={category as Category} />;
}
