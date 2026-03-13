import { ProjectsWorkspace } from "@/app/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    room?: string;
    assignee?: string;
    state?: string;
    location?: string;
    projectState?: string;
  }>;
}) {
  return <ProjectsWorkspace params={await searchParams} />;
}
