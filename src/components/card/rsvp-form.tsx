"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

type Reply = { name: string; attending: boolean; pax: number; phone: string | null; message: string | null };

export function RsvpForm({
  slug,
  maxPax,
  askPhone,
  existing,
  color,
}: {
  slug: string;
  maxPax: number;
  askPhone: boolean;
  existing: Reply | null;
  color: string;
}) {
  const t = useTranslations("rsvp");
  const [reply, setReply] = useState<Reply>(existing ?? { name: "", attending: true, pax: 1, phone: null, message: null });
  const [sent, setSent] = useState(Boolean(existing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    setBusy(true);
    setError(false);
    const response = await fetch(`/api/e/${slug}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...reply, pax: reply.attending ? reply.pax : 0 }),
    }).catch(() => null);
    setBusy(false);
    if (response?.ok) setSent(true);
    else setError(true);
  }

  if (sent) {
    return (
      <div className="text-center" data-testid="rsvp-done">
        <p className="text-lg font-medium">{t("thanks")}</p>
        <p className="mt-1 text-sm opacity-80">
          {reply.attending ? `${t("yes")} · ${reply.pax} pax` : t("no")}
        </p>
        <button type="button" onClick={() => setSent(false)} className="mt-3 min-h-11 font-medium underline">
          {t("change")}
        </button>
      </div>
    );
  }

  const field = "mt-1 block min-h-12 w-full rounded-xl border border-ink/20 bg-white px-4 text-ink";
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">{t("name")}</span>
        <input required maxLength={80} autoComplete="name" value={reply.name} onChange={(e) => setReply({ ...reply, name: e.target.value })} className={field} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">{t("attending")}</legend>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {[true, false].map((value) => (
            <label
              key={String(value)}
              className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 px-2 text-center text-sm font-medium ${
                reply.attending === value ? "text-white" : "border-ink/20 bg-white text-ink"
              }`}
              style={reply.attending === value ? { backgroundColor: color, borderColor: color } : undefined}
            >
              <input type="radio" name="attending" className="sr-only" checked={reply.attending === value} onChange={() => setReply({ ...reply, attending: value })} />
              {value ? t("yes") : t("no")}
            </label>
          ))}
        </div>
      </fieldset>
      {reply.attending ? (
        <label className="block">
          <span className="text-sm font-medium">{t("pax")}</span>
          <select value={reply.pax} onChange={(e) => setReply({ ...reply, pax: Number(e.target.value) })} className={field}>
            {Array.from({ length: maxPax }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {askPhone ? (
        <label className="block">
          <span className="text-sm font-medium">{t("phone")}</span>
          <input type="tel" inputMode="tel" autoComplete="tel" value={reply.phone ?? ""} onChange={(e) => setReply({ ...reply, phone: e.target.value })} className={field} />
        </label>
      ) : null}
      <label className="block">
        <span className="text-sm font-medium">{t("message")}</span>
        <textarea rows={3} maxLength={500} value={reply.message ?? ""} onChange={(e) => setReply({ ...reply, message: e.target.value })} className={`${field} py-3`} />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {t("error")}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-full text-lg font-medium text-white disabled:opacity-60" style={{ backgroundColor: color }}>
        {busy ? t("sending") : existing ? t("update") : t("submit")}
      </button>
    </form>
  );
}