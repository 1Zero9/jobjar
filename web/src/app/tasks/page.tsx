import { TaskWorkspace } from "@/app/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; lucky?: string; room?: string }>;
}) {
  return (
    <TaskWorkspace
      params={await searchParams}
      basePath="/tasks"
      primaryPanel="recorded"
      pageTitle="View tasks"
      pageSubtitle="Filter, edit, assign, and tidy what has been recorded."
    />
  );
}
