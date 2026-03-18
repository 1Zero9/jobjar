export type PersonOption = {
  id: string;
  displayName: string;
};

export type RoomOption = {
  id: string;
  name: string;
  designation?: string | null;
  location?: { id: string; name: string } | null;
};

export type GroupedRoomOptions = Array<
  [string, Array<{ id: string; name: string }>]
>;

export type TaskStandardDetail = {
  detailNotes: string | null;
  loggerName: string | null;
  priority: number;
  isPrivate: boolean;
  schedule: {
    recurrenceType: string;
    intervalCount: number;
    nextDueAt: string | null;
  } | null;
  occurrences: Array<{
    status: string;
    dueAt: string;
    completedAt: string | null;
    completedBy: string | null;
    completerName: string | null;
  }>;
};

export type ProjectSummarySnapshot = {
  totalChildren: number;
  completedChildren: number;
  overdueChildren: number;
  totalEstimatedMinutes: number;
};

export type TaskItem = {
  id: string;
  title: string;
  searchText: string;
  createdByUserId: string | null;
  roomId: string;
  roomName: string;
  locationId: string | null;
  locationName: string | null;
  loggerName: string | null;
  projectParentId: string | null;
  projectParentTitle: string | null;
  assignmentUserId: string | null;
  assignmentUserName: string | null;
  detailNotes: string | null;
  priority: number;
  isPrivate: boolean;
  jobKind: string;
  captureStage: string;
  validationMode: string;
  createdAt: string;
  estimatedMinutes: number;
  rewardCents: number | null;
  rewardConfirmed: boolean;
  rewardPaidAt: string | null;
  projectTargetAt: string | null;
  projectBudgetCents: number | null;
  projectSummary: ProjectSummarySnapshot | null;
  projectChildren: Array<{
    id: string;
    title: string;
    captureStage: string;
    estimatedMinutes: number;
    assignmentUserName: string | null;
    nextDueAt: string | null;
    occurrences: Array<{
      status: string;
      dueAt: string;
    }>;
  }>;
  projectCosts: Array<{
    id: string;
    title: string;
    amountCents: number;
    notedAt: string;
  }>;
  projectMaterials: Array<{
    id: string;
    title: string;
    quantityLabel: string | null;
    source: string | null;
    estimatedCostCents: number | null;
    actualCostCents: number | null;
    purchasedAt: string | null;
  }>;
  projectMilestones: Array<{
    id: string;
    title: string;
    targetAt: string | null;
    completedAt: string | null;
    sortOrder: number;
  }>;
  schedule: {
    recurrenceType: string;
    intervalCount: number;
    nextDueAt: string | null;
  } | null;
  occurrences: Array<{
    status: string;
    dueAt: string;
    completedAt: string | null;
    completedBy: string | null;
    completerName: string | null;
  }>;
  standardDetail: TaskStandardDetail | null;
};
