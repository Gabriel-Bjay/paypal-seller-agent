"use client";

import { useFormStatus } from "react-dom";

/** A submit button that shows a busy label while its form's server action runs. */
export function SubmitButton({
  children,
  busy,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  busy: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? busy : children}
    </button>
  );
}
