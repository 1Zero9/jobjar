import { TasksWorkspace } from "@/app/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; lucky?: string; room?: string; state?: string }>;
}) {
  return <TasksWorkspace params={await searchParams} />;
}
