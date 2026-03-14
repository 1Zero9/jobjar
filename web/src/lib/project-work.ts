import type { MemberRole } from "@prisma/client";

export function getProjectTaskWhere() {
  return {
    OR: [
      { jobKind: "project" as const },
      { projectChildren: { some: { active: true } } },
      { projectCosts: { some: {} } },
      { projectMaterials: { some: {} } },
      { projectMilestones: { some: {} } },
      { projectTargetAt: { not: null } },
      { projectBudgetCents: { not: null } },
    ],
  };
}

export function getPrivateTaskAccessWhere(userId: string) {
  return [
    { isPrivate: false },
    { isPrivate: true, createdByUserId: userId },
    { isPrivate: true, assignments: { some: { userId, assignedTo: null } } },
  ];
}

export function getMemberVisibleTaskWhere(role: MemberRole, userId: string) {
  if (role !== "member") {
    return {};
  }

  return {
    OR: [
      { createdByUserId: userId },
      { assignments: { some: { userId, assignedTo: null } } },
    ],
  };
}
