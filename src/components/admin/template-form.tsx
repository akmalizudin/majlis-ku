"use client";

import { saveTemplateAction } from "@/server/admin/actions";
import { invalidProps, ResultNote, useAdminForm, type ResultLabels } from "./form-kit";
import { buttonClass, inputClass } from "./ui";

export type TemplateFormLabels = {
  result: ResultLabels;
  fields: Record<"code" | "nameMs" | "nameEn" | "layout" | "font" | "primary" | "background" | "accent" | "active" | "sortOrder", string>;
  codeNote: string;
  layouts: Record<"classic" | "modern" | "floral", string>;
  fonts: Record<"serif" | "sans", string>;
  save: string;
};

export type TemplateFormValues = {
  code: string;
  nameMs: string;
  nameEn: string;
  layout: "classic" | "modern" | "floral";
  font: "serif" | "sans";
  primary: string;
  background: string;
  accent: string;
  active: boolean;
  sortOrder: string;
};

/** `templateId` null creates (the code field shows); otherwise it edits and the code is fixed. */
export function TemplateForm({ templateId, values, labels }: { templateId: string | null; values: TemplateFormValues; labels: TemplateFormLabels }) {
  const create = templateId === null;
  const { result, pending, onSubmit, noteId } = useAdminForm((formData) => saveTemplateAction(templateId, null, formData), { resetOnOk: create });
  const field = (name: "nameMs" | "nameEn" | "sortOrder" | "code") => (
    <label className="block">
      <span className="text-sm font-medium">{labels.fields[name]}</span>
      <input
        name={name}
        defaultValue={values[name]}
        required
        autoComplete="off"
        inputMode={name === "sortOrder" ? "numeric" : undefined}
        className={inputClass}
        {...invalidProps(result, name, noteId)}
      />
      {name === "code" ? <span className="mt-1 block text-xs text-ink/60">{labels.codeNote}</span> : null}
    </label>
  );
  const select = <K extends "layout" | "font">(name: K, options: Record<string, string>) => (
    <label className="block">
      <span className="text-sm font-medium">{labels.fields[name]}</span>
      <select name={name} defaultValue={values[name]} className={inputClass}>
        {Object.entries(options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  const colour = (name: "primary" | "background" | "accent") => (
    <label className="block">
      <span className="text-sm font-medium">{labels.fields[name]}</span>
      <input type="color" name={name} defaultValue={values[name]} className="mt-1 block h-11 w-full rounded-xl border border-ink/20 bg-white p-1" {...invalidProps(result, name, noteId)} />
    </label>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {create ? field("code") : null}
        {field("nameMs")}
        {field("nameEn")}
        {field("sortOrder")}
        {select("layout", labels.layouts)}
        {select("font", labels.fonts)}
        {colour("primary")}
        {colour("background")}
        {colour("accent")}
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="active" defaultChecked={values.active} className="size-5" />
        <span className="text-sm font-medium">{labels.fields.active}</span>
      </label>
      <ResultNote id={noteId} result={result} labels={labels.result} fieldLabels={labels.fields} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {labels.save}
      </button>
    </form>
  );
}
