import { logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";

export function LogoutIconButton() {
  return (
    <form action={logoutAction}>
      <FormActionButton className="action-btn subtle quiet icon-only" pendingLabel="Logging out">
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
          </svg>
          <span className="theme-toggle-sr">Log out</span>
        </>
      </FormActionButton>
    </form>
  );
}
