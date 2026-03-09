"use client";

import { useFormStatus } from "react-dom";

type FormActionButtonProps = {
  children: string;
  pendingLabel?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
};

export function FormActionButton({
  children,
  pendingLabel,
  className,
  type = "submit",
}: FormActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type={type}
      className={className}
      disabled={pending}
      aria-disabled={pending}
      data-pending={pending ? "true" : "false"}
    >
      {pending ? (pendingLabel ?? `${children}...`) : children}
    </button>
  );
}
