"use client";

import { useFormStatus } from "react-dom";

type FormActionButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Override pending state from outside the form (e.g. from a manual startTransition) */
  isPending?: boolean;
};

export function FormActionButton({
  children,
  pendingLabel,
  className,
  type = "submit",
  onClick,
  isPending: isPendingProp,
}: FormActionButtonProps) {
  const { pending: formPending } = useFormStatus();
  const pending = isPendingProp ?? formPending;

  return (
    <button
      type={type}
      className={className}
      disabled={pending}
      aria-disabled={pending}
      data-pending={pending ? "true" : "false"}
      onClick={onClick}
    >
      {pending ? (pendingLabel ?? `${children}...`) : children}
    </button>
  );
}
