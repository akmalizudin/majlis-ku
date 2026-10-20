"use client";

import { useActionState } from "react";
import type { DeleteFormState } from "@/server/moderation/actions";

export function DeleteEventForm({
  action,
  slug,
  labels,
}: {
  action: (state: DeleteFormState, formData: FormData) => Promise<DeleteFormState>;
  slug: string;
  labels: { title: string; body: string; confirmLabel: string; button: string; confirm: string; has_payments: string; forbidden: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-5">
      <h2 className="font-serif text-2xl text-red-800">{labels.title}</h2>
      <p className="mt-2 text-sm text-red-900/80">{labels.body}</p>
      <label className="mt-4 block">
        <span className="text-sm font-medium">{labels.confirmLabel}</span>
        <input name="confirm" autoComplete="off" className="mt-1 block min-h-11 w-full rounded-xl border border-red-300 bg-white px-4 font-mono" placeholder={slug} />
      </label>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {labels[state.error]}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="mt-3 min-h-11 rounded-full bg-red-700 px-5 text-sm font-medium text-white disabled:opacity-50">
        {labels.button}
      </button>
    </form>
  );
}