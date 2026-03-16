import { ProjectsWorkspace } from "@/app/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    added?: string;
    updated?: string;
    removed?: string;
    error?: string;
    room?: string;
    assignee?: string;
    state?: string;
    location?: string;
    q?: string;
  }>;
}) {
  return <ProjectsWorkspace params={await searchParams} />;
}
