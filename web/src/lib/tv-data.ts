import { getDashboardData } from "@/lib/dashboard-data";
import { deriveTaskRag } from "@/lib/rag";

export type TvData = {
  totalTasks: number;
  doneTasks: number;
  pendingTasks: number;
  rag: { green: number; amber: number; red: number };
  roomLoad: Array<{ room: string; total: number; overdue: number }>;
};

export async function getTvData(): Promise<TvData> {
  const { rooms, tasks } = await getDashboardData();
  const now = new Date();

  const rag = { green: 0, amber: 0, red: 0 };
  for (const task of tasks) {
    const status = deriveTaskRag(task, now);
    rag[status] += 1;
  }

  const roomLoad = rooms.map((room) => {
    const roomTasks = tasks.filter((task) => task.roomId === room.id);
    const overdue = roomTasks.filter((task) => deriveTaskRag(task, now) === "red").length;
    return {
      room: room.name,
      total: roomTasks.length,
      overdue,
    };
  });

  return {
    totalTasks: tasks.length,
    doneTasks: tasks.filter((task) => task.status === "done").length,
    pendingTasks: tasks.filter((task) => task.status !== "done").length,
    rag,
    roomLoad,
  };
}
