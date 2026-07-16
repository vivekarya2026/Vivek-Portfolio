import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <CategoryEditor category={data as Category} />;
}
