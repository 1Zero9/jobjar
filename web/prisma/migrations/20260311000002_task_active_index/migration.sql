-- Compound index to speed up the most common task query pattern: active tasks in a room.
-- Every list page (dashboard, tasks, admin) filters on both roomId and active together.
CREATE INDEX "Task_roomId_active_idx" ON "Task"("roomId", "active");
