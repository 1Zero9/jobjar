import { LogWorkspace } from "@/app/components/TaskWorkspace";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; updated?: string; error?: string; taskId?: string }>;
}) {
  return <LogWorkspace params={await searchParams} />;
}
