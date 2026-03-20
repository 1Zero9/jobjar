"use client";

import { FormActionButton } from "@/app/components/FormActionButton";
import { startTransition, useRef, useState } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  className: string;
  label: string;
  pendingLabel?: string;
  /**
   * Called synchronously inside the same startTransition as the server action.
   * Use this to trigger optimistic UI updates that need to persist for the
   * duration of the server round-trip.
   */
  onOptimisticUpdate?: () => void;
};

export function TaskCardSummaryAction({
  action,
  fields = {},
  className,
  label,
  pendingLabel,
  onOptimisticUpdate,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);

  function handleClick() {
    if (onOptimisticUpdate) {
      // Build FormData from the hidden fields and call the action directly
      // inside a single startTransition so the optimistic update persists
      // for the full server round-trip.
      const fd = new FormData();
      for (const [name, value] of Object.entries(fields)) {
        fd.set(name, value);
      }
      startTransition(async () => {
        setIsPending(true);
        try {
          onOptimisticUpdate();
          await action(fd);
        } finally {
          setIsPending(false);
        }
      });
    } else {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form action={action} ref={formRef} onClick={(event) => event.stopPropagation()}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormActionButton
        type="button"
        className={className}
        pendingLabel={pendingLabel}
        isPending={isPending}
        onClick={handleClick}
      >
        {label}
      </FormActionButton>
    </form>
  );
}
