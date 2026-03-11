"use client";

type AutoSubmitSelectProps = {
  name: string;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
};

export function AutoSubmitSelect({
  name,
  defaultValue = "",
  className,
  children,
}: AutoSubmitSelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(event) => {
        event.currentTarget.form?.requestSubmit();
      }}
    >
      {children}
    </select>
  );
}
