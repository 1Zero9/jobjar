import type { MemberAudience, MemberRole, Prisma } from "@prisma/client";
import { getRoomLocationAccessWhere } from "@/lib/location-access";
import { getAudienceAssignedTaskWhere } from "@/lib/member-audience";

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

type TaskVisibilityOptions = {
  householdId: string;
  userId: string;
  role: MemberRole;
  audienceBand: MemberAudience;
  allowedLocationIds: string[] | null | undefined;
  extraWhere?: Prisma.TaskWhereInput;
};

export function getVisibleTaskWhere({
  householdId,
  userId,
  role,
  audienceBand,
  allowedLocationIds,
  extraWhere,
}: TaskVisibilityOptions): Prisma.TaskWhereInput {
  const memberVisibleTaskWhere = getMemberVisibleTaskWhere(role, userId);
  const privateTaskAccess = role === "admin" ? null : getPrivateTaskAccessWhere(userId);

  return {
    room: {
      householdId,
      ...getRoomLocationAccessWhere(allowedLocationIds),
    },
    ...getAudienceAssignedTaskWhere(userId, audienceBand),
    AND: [
      ...(Object.keys(memberVisibleTaskWhere).length > 0 ? [memberVisibleTaskWhere] : []),
      ...(privateTaskAccess ? [{ OR: privateTaskAccess }] : []),
      ...(extraWhere ? [extraWhere] : []),
    ],
  };
}
