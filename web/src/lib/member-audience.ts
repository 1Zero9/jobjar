import { MemberAudience } from "@prisma/client";

export function isChildAudience(audienceBand: MemberAudience) {
  return audienceBand === "under_12";
}

export function isTeenAudience(audienceBand: MemberAudience) {
  return audienceBand === "teen_12_18";
}

export function shouldRestrictToAssignedTasks(audienceBand: MemberAudience) {
  return isChildAudience(audienceBand);
}

export function canAccessExtendedViews(audienceBand: MemberAudience) {
  return !isChildAudience(audienceBand);
}

export function getAudienceAssignedTaskWhere(userId: string, audienceBand: MemberAudience) {
  return shouldRestrictToAssignedTasks(audienceBand)
    ? {
        assignments: {
          some: {
            userId,
            assignedTo: null,
          },
        },
      }
    : {};
}

export function getAudienceThemeClassName(audienceBand: MemberAudience) {
  if (audienceBand === "under_12") {
    return "audience-under-12";
  }
  if (audienceBand === "teen_12_18") {
    return "audience-teen-12-18";
  }
  return "audience-adult";
}

export function formatAudienceBand(audienceBand: MemberAudience) {
  if (audienceBand === "under_12") {
    return "Under 12";
  }
  if (audienceBand === "teen_12_18") {
    return "12 to 18";
  }
  return "Adult";
}
