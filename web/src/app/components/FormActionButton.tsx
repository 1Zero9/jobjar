"use client";

import { useFormStatus } from "react-dom";

type FormActionButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export function FormActionButton({
  children,
  pendingLabel,
  className,
  type = "submit",
  onClick,
}: FormActionButtonProps) {
  const { pending } = useFormStatus();

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
