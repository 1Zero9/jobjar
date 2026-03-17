import { MemberAudience, MemberProfileTheme } from "@prisma/client";

export function isChildAudience(audienceBand: MemberAudience) {
  return audienceBand === "under_12";
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
  return "audience-adult";
}

export function getProfileThemeClassName(profileTheme: MemberProfileTheme) {
  if (profileTheme === "boy_blue") {
    return "profile-boy-blue";
  }
  if (profileTheme === "girl_pink") {
    return "profile-girl-pink";
  }
  return "profile-default-theme";
}

export function getMemberThemeClassName(audienceBand: MemberAudience, profileTheme: MemberProfileTheme) {
  return `${getAudienceThemeClassName(audienceBand)} ${getProfileThemeClassName(profileTheme)}`.trim();
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

export function formatProfileTheme(profileTheme: MemberProfileTheme) {
  if (profileTheme === "boy_blue") {
    return "Boy / blue";
  }
  if (profileTheme === "girl_pink") {
    return "Girl / pink";
  }
  return "Default";
}
