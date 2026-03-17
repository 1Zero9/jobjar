"use client";

import { FormActionButton } from "@/app/components/FormActionButton";
import { useRef } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  className: string;
  label: string;
  pendingLabel?: string;
};

export function TaskCardSummaryAction({
  action,
  fields = {},
  className,
  label,
  pendingLabel,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={action} ref={formRef} onClick={(event) => event.stopPropagation()}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormActionButton
        type="button"
        className={className}
        pendingLabel={pendingLabel}
        onClick={() => {
          formRef.current?.requestSubmit();
        }}
      >
        {label}
      </FormActionButton>
    </form>
  );
}
