import { createClient } from "@/lib/supabase/server";
import { CollectionHeader, EmptyState } from "@/components/admin/collection-chrome";
import { CategoriesList } from "./categories-list";
import { NewCategoryButton } from "./new-category-button";
import type { Category } from "@/lib/types";

export const metadata = { title: "Project Categories - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: false });

  const categories = (data ?? []) as Category[];

  return (
    <>
      <CollectionHeader title="Project Categories" count={categories.length}>
        <NewCategoryButton />
      </CollectionHeader>
      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Categories group your projects (e.g. Product Design, UX Design). Create your first one."
          action={<NewCategoryButton />}
        />
      ) : (
        <CategoriesList categories={categories} />
      )}
    </>
  );
}
