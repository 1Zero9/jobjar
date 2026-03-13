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
