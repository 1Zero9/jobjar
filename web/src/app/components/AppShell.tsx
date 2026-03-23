import { AppBottomNav } from "@/app/components/AppBottomNav";
import { PageTransition } from "@/app/components/PageTransition";
import { canAccessReportingViewsRole, canManagePeopleRole, canUseMemberActions, getSessionContext } from "@/lib/auth";
import { canAccessExtendedViews, isChildAudience } from "@/lib/member-audience";
import type { ReactNode } from "react";

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getSessionContext();

  if (!session) {
    return children;
  }

  const childMode = isChildAudience(session.audienceBand);
  const canSeeExtended = canAccessExtendedViews(session.audienceBand);
  const canLog = canUseMemberActions(session.role) && canSeeExtended;
  const canSeeReports = canAccessReportingViewsRole(session.role) && canSeeExtended;
  const isAdmin = session.role === "admin";
  const canManagePeople = canManagePeopleRole(session.role);

  return (
    <div className="app-shell">
      <PageTransition>{children}</PageTransition>
      <AppBottomNav
        childMode={childMode}
        canLog={canLog}
        canSeeReports={canSeeReports}
        displayName={session.displayName ?? ""}
        isAdmin={isAdmin}
        canManagePeople={canManagePeople}
      />
    </div>
  );
}
