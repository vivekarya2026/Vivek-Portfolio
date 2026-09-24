import { getProjectById } from "@/lib/data/projects";
import { listCategories } from "@/lib/data/categories";
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

  const [project, cats] = await Promise.all([
    getProjectById(id),
    listCategories(),
  ]);

  if (!project) notFound();

  return (
    <ProjectEditor
      project={project as Project}
      categories={cats as Pick<Category, "id" | "name" | "slug">[]}
    />
  );
}
