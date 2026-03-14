import { logoutAction } from "@/app/actions";
import { FormActionButton } from "@/app/components/FormActionButton";

export function LogoutIconButton() {
  return (
    <form action={logoutAction}>
      <FormActionButton className="action-btn subtle quiet icon-only" pendingLabel="">
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 8V7a4 4 0 1 0-8 0v3" />
            <path d="M8 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" />
            <path d="M12 15h.01" />
          </svg>
          <span className="theme-toggle-sr">Log out</span>
        </>
      </FormActionButton>
    </form>
  );
}
