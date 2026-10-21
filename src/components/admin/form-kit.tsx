"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import type { AdminError, AdminResult } from "@/server/admin/mutations";

export type ResultLabels = { saved: string; check: string; errors: Record<AdminError, string> };

/**
 * Runs an admin action from a form and keeps its result.
 * Not `<form action>`: React would reset the fields after a failed save and the admin would lose what they typed.
 */
export function useAdminForm(run: (formData: FormData) => Promise<AdminResult>, { resetOnOk = false }: { resetOnOk?: boolean } = {}) {
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, startTransition] = useTransition();
  const noteId = useId();
  const submit = (formData: FormData, form?: HTMLFormElement) =>
    startTransition(async () => {
      const outcome = await run(formData);
      setResult(outcome);
      if (outcome.ok && resetOnOk) form?.reset();
    });
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    submit(new FormData(form, (event.nativeEvent as SubmitEvent).submitter), form);
  };
  return { result, pending, submit, onSubmit, noteId };
}

/** `aria-invalid` for an input the server rejected, described by the form's `ResultNote` (`noteId` from `useAdminForm`). */
export const invalidProps = (result: AdminResult | null, name: string, noteId: string) =>
  result && !result.ok && result.fields?.includes(name) ? ({ "aria-invalid": true, "aria-describedby": noteId } as const) : {};

export function ResultNote({ id, result, labels, fieldLabels }: { id: string; result: AdminResult | null; labels: ResultLabels; fieldLabels?: Record<string, string> }) {
  if (!result) return null;
  if (result.ok) {
    return (
      <p id={id} role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
        {labels.saved}
      </p>
    );
  }
  const fields = result.fields?.map((field) => fieldLabels?.[field] ?? field).join(", ");
  return (
    <p id={id} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
      {labels.errors[result.error]}
      {fields ? ` ${labels.check}: ${fields}.` : ""}
    </p>
  );
}
