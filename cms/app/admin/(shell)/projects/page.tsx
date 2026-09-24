import { CollectionHeader, EmptyState } from "@/components/admin/collection-chrome";
import { listProjects } from "@/lib/data/projects";
import type { ProjectWithCategory } from "@/lib/types";
import { NewProjectButton } from "./new-project-button";
import { ProjectsList } from "./projects-list";

export const metadata = { title: "Projects - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: ProjectWithCategory[] = [];
  let errorMsg: string | null = null;

  try {
    projects = await listProjects();
  } catch (err) {
    errorMsg = (err as Error).message;
    console.error("projects list failed:", errorMsg);
  }

  if (errorMsg) {
    return (
      <>
        <CollectionHeader title="Projects" />
        <EmptyState title="Couldn't load projects" description={errorMsg} />
      </>
    );
  }

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
