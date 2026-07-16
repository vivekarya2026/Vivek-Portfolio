import { CollectionHeader, EmptyState } from "@/components/admin/collection-chrome";
import { createClient } from "@/lib/supabase/server";
import type { ProjectWithCategory } from "@/lib/types";
import { NewProjectButton } from "./new-project-button";
import { ProjectsList } from "./projects-list";

export const metadata = { title: "Projects - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const select = "*, categories(id, name, slug)";

  // Prefer manual priority (sort_order). Fall back if that column hasn't
  // been migrated yet so the list never looks empty by accident.
  let { data, error } = await supabase
    .from("projects")
    .select(select)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error?.message?.includes("sort_order")) {
    ({ data, error } = await supabase
      .from("projects")
      .select(select)
      .order("created_at", { ascending: false }));
  }

  if (error) {
    console.error("projects list failed:", error.message);
  }

  const projects = (data ?? []) as ProjectWithCategory[];

  return (
    <>
      <CollectionHeader title="Projects" count={projects.length}>
        <NewProjectButton />
      </CollectionHeader>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first case study. You can save it as a draft and publish when ready."
          action={<NewProjectButton />}
        />
      ) : (
        <ProjectsList projects={projects} />
      )}
    </>
  );
}
