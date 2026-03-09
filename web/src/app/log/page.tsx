import { TaskWorkspace } from "@/app/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; lucky?: string; room?: string }>;
}) {
  return (
    <TaskWorkspace
      params={await searchParams}
      basePath="/log"
      primaryPanel="capture"
      pageTitle="Record a task"
      pageSubtitle="Walk into a room, note the job, move on."
    />
  );
}
