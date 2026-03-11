"use client";

import type { ReactNode } from "react";

type AutoSubmitFormProps = {
  action: string;
  children: ReactNode;
  className?: string;
};

export function AutoSubmitForm({ action, children, className }: AutoSubmitFormProps) {
  return (
    <form
      method="get"
      action={action}
      className={className}
      onChange={(event) => {
        const target = event.target;
        if (target instanceof HTMLSelectElement) {
          target.form?.requestSubmit();
        }
      }}
    >
      {children}
    </form>
  );
}
