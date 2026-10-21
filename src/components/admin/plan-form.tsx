"use client";

import { updatePlanAction } from "@/server/admin/actions";
import { invalidProps, ResultNote, useAdminForm, type ResultLabels } from "./form-kit";
import { buttonClass, inputClass } from "./ui";

export type PlanFormLabels = {
  result: ResultLabels;
  fields: Record<"nameMs" | "nameEn" | "price" | "uploadLimit" | "videoAllowed" | "maxVideoSeconds" | "maxUploadMb" | "storageLimitMb" | "retentionDays" | "active" | "sortOrder", string>;
  notes: Partial<Record<"uploadLimit" | "maxVideoSeconds" | "maxUploadMb" | "storageLimitMb" | "retentionDays", string>>;
  save: string;
};

/** Every value is a string, as the inputs hold them; the server schema converts ringgit to sen and MB to bytes. */
export type PlanFormValues = {
  nameMs: string;
  nameEn: string;
  price: string;
  uploadLimit: string;
  videoAllowed: boolean;
  maxVideoSeconds: string;
  maxUploadMb: string;
  storageLimitMb: string;
  retentionDays: string;
  active: boolean;
  sortOrder: string;
};

export function PlanForm({ planId, values, labels }: { planId: string; values: PlanFormValues; labels: PlanFormLabels }) {
  const { result, pending, onSubmit, noteId } = useAdminForm((formData) => updatePlanAction(planId, null, formData));
  // Never `disabled`: a disabled input is not submitted, so an unchecked-looking Free "active" would fail the save.
  const text = (name: keyof PlanFormValues, inputMode?: "numeric" | "decimal", required = true) => (
    <label key={name} className="block">
      <span className="text-sm font-medium">{labels.fields[name]}</span>
      <input
        name={name}
        defaultValue={values[name] as string}
        required={required}
        inputMode={inputMode}
        autoComplete="off"
        className={inputClass}
        {...invalidProps(result, name, noteId)}
      />
      {name in labels.notes ? <span className="mt-1 block text-xs text-ink/60">{labels.notes[name as keyof PlanFormLabels["notes"]]}</span> : null}
    </label>
  );
  const check = (name: "videoAllowed" | "active") => (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" name={name} defaultChecked={values[name]} className="size-5" />
      <span className="text-sm font-medium">{labels.fields[name]}</span>
    </label>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {text("nameMs")}
        {text("nameEn")}
        {text("price", "decimal")}
        {text("sortOrder", "numeric")}
        {text("uploadLimit", "numeric", false)}
        {text("storageLimitMb", "numeric", false)}
        {text("maxUploadMb", "numeric")}
        {text("maxVideoSeconds", "numeric", false)}
        {text("retentionDays", "numeric")}
      </div>
      <div className="flex flex-wrap gap-x-6">
        {check("videoAllowed")}
        {check("active")}
      </div>
      <ResultNote id={noteId} result={result} labels={labels.result} fieldLabels={labels.fields} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {labels.save}
      </button>
    </form>
  );
}
