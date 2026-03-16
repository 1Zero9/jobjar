import { AppBottomNav } from "@/app/components/AppBottomNav";
import { canAccessReportingViewsRole, canUseMemberActions, getSessionContext } from "@/lib/auth";
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

  return (
    <div className="app-shell">
      <div className="app-shell-content">{children}</div>
      <AppBottomNav childMode={childMode} canLog={canLog} canSeeReports={canSeeReports} />
    </div>
  );
}
