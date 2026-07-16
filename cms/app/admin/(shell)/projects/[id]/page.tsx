import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Category, Project } from "@/lib/types";
import { ProjectEditor } from "./project-editor";

export const dynamic = "force-dynamic";

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: cats }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name, slug").order("name"),
  ]);

  if (!project) notFound();

  return (
    <ProjectEditor
      project={project as Project}
      categories={(cats ?? []) as Pick<Category, "id" | "name" | "slug">[]}
    />
  );
}
