"use client";

import type { Locale } from "@/i18n/routing";
import { adminDeleteEventAction, changeEventPlanAction, handleReportAction, suspendEventAction, unsuspendEventAction } from "@/server/admin/actions";
import { invalidProps, ResultNote, useAdminForm, type ResultLabels } from "./form-kit";
import { buttonClass, ghostButtonClass, inputClass } from "./ui";

export type EventActionLabels = {
  result: ResultLabels;
  changePlan: string;
  changePlanHelp: string;
  changePlanButton: string;
  plan: string;
  suspend: string;
  unsuspend: string;
  suspendHelp: string;
  deleteTitle: string;
  deleteBody: string;
  deleteLabel: string;
  deleteButton: string;
};

export function ChangePlanForm({
  eventId,
  currentCode,
  plans,
  labels,
}: {
  eventId: string;
  currentCode: string;
  plans: { code: string; label: string }[];
  labels: EventActionLabels;
}) {
  const { result, pending, onSubmit, noteId } = useAdminForm((formData) => changeEventPlanAction(eventId, null, formData));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="font-serif text-2xl">{labels.changePlan}</h2>
      <p className="text-sm text-ink/60">{labels.changePlanHelp}</p>
      <label className="block">
        <span className="text-sm font-medium">{labels.plan}</span>
        <select name="planCode" defaultValue={currentCode} className={inputClass} {...invalidProps(result, "planCode", noteId)}>
          {plans.map((plan) => (
            <option key={plan.code} value={plan.code}>
              {plan.label}
            </option>
          ))}
        </select>
      </label>
      <ResultNote id={noteId} result={result} labels={labels.result} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {labels.changePlanButton}
      </button>
    </form>
  );
}

export function SuspendButton({ eventId, suspended, labels }: { eventId: string; suspended: boolean; labels: EventActionLabels }) {
  const { result, pending, submit, noteId } = useAdminForm(() => (suspended ? unsuspendEventAction(eventId) : suspendEventAction(eventId)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">{labels.suspendHelp}</p>
      <ResultNote id={noteId} result={result} labels={labels.result} />
      <button
        type="button"
        disabled={pending}
        onClick={() => submit(new FormData())}
        className={suspended ? buttonClass : "inline-flex min-h-11 items-center justify-center rounded-full bg-amber-600 px-5 text-sm font-medium text-white disabled:opacity-50"}
      >
        {suspended ? labels.unsuspend : labels.suspend}
      </button>
    </div>
  );
}

export function AdminDeleteEventForm({ eventId, slug, locale, labels }: { eventId: string; slug: string; locale: Locale; labels: EventActionLabels }) {
  const { result, pending, onSubmit, noteId } = useAdminForm((formData) => adminDeleteEventAction(locale, eventId, null, formData));
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-5">
      <h2 className="font-serif text-2xl text-red-800">{labels.deleteTitle}</h2>
      <p className="mt-2 text-sm text-red-900/80">{labels.deleteBody}</p>
      <label className="mt-4 block">
        <span className="text-sm font-medium">{labels.deleteLabel}</span>
        <input name="confirmSlug" autoComplete="off" required className={`${inputClass} border-red-300 font-mono`} placeholder={slug} {...invalidProps(result, "confirmSlug", noteId)} />
      </label>
      <div className="mt-2">
        <ResultNote id={noteId} result={result} labels={labels.result} />
      </div>
      <button type="submit" disabled={pending} className="mt-3 min-h-11 rounded-full bg-red-700 px-5 text-sm font-medium text-white disabled:opacity-50">
        {labels.deleteButton}
      </button>
    </form>
  );
}

export type ReportActionLabels = { result: ResultLabels; resolve: string; dismiss: string };

/** `resolveName` and `dismissName` carry the reason and event slug, so each row's buttons have a distinct accessible name. */
export function ReportActions({ reportId, labels, resolveName, dismissName }: { reportId: string; labels: ReportActionLabels; resolveName: string; dismissName: string }) {
  const { result, pending, submit, noteId } = useAdminForm((formData) => handleReportAction(reportId, formData));
  const act = (outcome: "RESOLVED" | "DISMISSED") => {
    const formData = new FormData();
    formData.set("outcome", outcome);
    submit(formData);
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => act("RESOLVED")} aria-label={resolveName} className={buttonClass}>
          {labels.resolve}
        </button>
        <button type="button" disabled={pending} onClick={() => act("DISMISSED")} aria-label={dismissName} className={ghostButtonClass}>
          {labels.dismiss}
        </button>
      </div>
      <ResultNote id={noteId} result={result} labels={labels.result} />
    </div>
  );
}
