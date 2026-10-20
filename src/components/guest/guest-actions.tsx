"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { compressImage, postJson, UploadError, uploadOne, type Stage } from "./upload-client";

type View = "pin" | "name" | "menu" | "photo" | "wish" | "thanks";

type QueueItem = { id: number; name: string; file: File; stage: Stage | "queued" | "failed"; progress: number; error?: string };

const NAME_KEY = "mk_name";
const CONSENT_KEY = "mk_consent";
const CONCURRENCY = 2;

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the cookie still identifies the device.
  }
}

const KNOWN_ERRORS = [
  "limit_reached",
  "storage_full",
  "too_large",
  "too_long",
  "invalid_type",
  "invalid_file",
  "gallery_not_in_plan",
  "video_not_in_plan",
  "rate_limited",
] as const;

export function GuestActions({
  slug,
  needsPin,
  initialName,
  galleryHref,
  features,
}: {
  slug: string;
  needsPin: boolean;
  initialName: string | null;
  galleryHref: string | null;
  /** Which upload kinds are switched on (video and voice arrive in phase 3). */
  features: { video: boolean; voice: boolean };
}) {
  const t = useTranslations("guest");
  const [view, setView] = useState<View>(needsPin ? "pin" : initialName ? "menu" : "name");
  const [name, setName] = useState(initialName ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (!initialName) setName(storageGet(NAME_KEY) ?? "");
    setConsent(storageGet(CONSENT_KEY) === "1");
  }, [initialName]);

  const errorText = (code: string) => t(`errors.${(KNOWN_ERRORS as readonly string[]).includes(code) ? code : "generic"}`);

  async function submitPin(form: HTMLFormElement) {
    const pin = String(new FormData(form).get("pin") ?? "");
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/e/${slug}/pin`, { pin });
      setView(name && initialName ? "menu" : "name");
    } catch (e) {
      setError(e instanceof UploadError && e.code === "locked" ? t("pinLocked") : t("pinWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function submitName(form: HTMLFormElement) {
    const displayName = String(new FormData(form).get("displayName") ?? "").trim();
    if (!displayName) return;
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<{ displayName: string }>(`/api/e/${slug}/guest`, { displayName });
      setName(result.displayName);
      storageSet(NAME_KEY, result.displayName);
      setView("menu");
    } catch (e) {
      if (e instanceof UploadError && e.code === "pin_required") setView("pin");
      else setError(errorText(e instanceof UploadError ? e.code : "generic"));
    } finally {
      setBusy(false);
    }
  }

  function agree(value: boolean) {
    setConsent(value);
    if (value) storageSet(CONSENT_KEY, "1");
  }

  function update(id: number, patch: Partial<QueueItem>) {
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function runOne(item: QueueItem): Promise<boolean> {
    try {
      update(item.id, { stage: "compressing", error: undefined, progress: 0 });
      const blob = await compressImage(item.file);
      await uploadOne({
        slug,
        kind: "PHOTO",
        blob,
        onStage: (stage) => update(item.id, { stage }),
        onProgress: (progress) => update(item.id, { progress }),
      });
      return true;
    } catch (e) {
      update(item.id, { stage: "failed", error: errorText(e instanceof UploadError ? e.code : "generic") });
      return false;
    }
  }

  async function runQueue(items: QueueItem[]) {
    let index = 0;
    const results: boolean[] = [];
    async function worker() {
      while (index < items.length) {
        const item = items[index++]!;
        results.push(await runOne(item));
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    if (results.length > 0 && results.every(Boolean)) setView("thanks");
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const items: QueueItem[] = Array.from(files).map((file) => ({ id: nextId.current++, name: file.name, file, stage: "queued", progress: 0 }));
    setQueue((current) => [...current, ...items]);
    void runQueue(items);
  }

  async function submitWish(form: HTMLFormElement) {
    const message = String(new FormData(form).get("message") ?? "").trim();
    if (!message) return;
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/e/${slug}/wishes`, { message });
      form.reset();
      setView("thanks");
    } catch (e) {
      setError(errorText(e instanceof UploadError ? e.code : "generic"));
    } finally {
      setBusy(false);
    }
  }

  const button = "min-h-12 w-full rounded-full bg-brand px-6 text-lg font-medium text-white disabled:opacity-60";
  const card = "mt-6 rounded-3xl bg-white p-5 shadow-sm";
  const errorBox = error ? (
    <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-800">
      {error}
    </p>
  ) : null;

  if (view === "pin") {
    return (
      <section className={card}>
        <h2 className="font-serif text-2xl">{t("pinTitle")}</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitPin(e.currentTarget);
          }}
        >
          <label className="block">
            <span className="text-sm font-medium">{t("pinLabel")}</span>
            <input
              name="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{4,8}"
              maxLength={8}
              required
              className="mt-1 block min-h-12 w-full rounded-xl border border-ink/20 px-4 text-center text-2xl tracking-[0.5em]"
            />
          </label>
          <button type="submit" disabled={busy} className={button}>
            {t("pinSubmit")}
          </button>
        </form>
        {errorBox}
      </section>
    );
  }

  if (view === "name") {
    return (
      <section className={card}>
        <h2 className="font-serif text-2xl">{t("nameTitle")}</h2>
        <p className="mt-1 text-ink/70">{t("nameHelp")}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitName(e.currentTarget);
          }}
        >
          <label className="block">
            <span className="sr-only">{t("nameLabel")}</span>
            <input
              name="displayName"
              defaultValue={name}
              key={name}
              required
              maxLength={40}
              autoComplete="name"
              placeholder={t("namePlaceholder")}
              className="block min-h-12 w-full rounded-xl border border-ink/20 px-4 text-lg"
            />
          </label>
          <button type="submit" disabled={busy} className={button}>
            {t("nameSubmit")}
          </button>
        </form>
        {errorBox}
      </section>
    );
  }

  if (view === "thanks") {
    return (
      <section className={`${card} text-center`}>
        <p aria-hidden className="text-5xl">
          💐
        </p>
        <h2 className="mt-2 font-serif text-3xl">{t("thanksTitle")}</h2>
        <p className="mt-2 text-ink/70">{t("thanksBody")}</p>
        <div className="mt-5 space-y-2">
          {galleryHref ? (
            <a href={galleryHref} className={`${button} inline-flex items-center justify-center`}>
              {t("viewGallery")}
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setQueue([]);
              setView("menu");
            }}
            className="min-h-12 w-full rounded-full border border-ink/20 px-6 font-medium"
          >
            {t("addMore")}
          </button>
        </div>
      </section>
    );
  }

  const consentBox = (
    <div className="mt-4 rounded-2xl bg-cream p-4 text-sm text-ink/80">
      <p>{t("consent")}</p>
      <label className="mt-3 flex min-h-11 items-center gap-3 font-medium">
        <input type="checkbox" checked={consent} onChange={(e) => agree(e.target.checked)} className="size-5" />
        {t("consentAgree")}
      </label>
    </div>
  );

  const back = (
    <button type="button" onClick={() => setView("menu")} className="min-h-11 text-sm font-medium text-ink/70 underline">
      ← {t("back")}
    </button>
  );

  if (view === "photo") {
    const done = queue.filter((item) => item.stage === "done").length;
    return (
      <section className={card}>
        {back}
        <h2 className="mt-2 font-serif text-2xl">{t("photo")}</h2>
        {consentBox}
        <label
          className={`${button} mt-4 inline-flex cursor-pointer items-center justify-center ${consent ? "" : "pointer-events-none opacity-50"}`}
          aria-disabled={!consent}
        >
          📷 {t("photoPick")}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={!consent}
            className="sr-only"
            data-testid="photo-input"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 text-center text-sm text-ink/60">{t("photoHelp")}</p>
        {queue.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-medium" aria-live="polite">
              {t("progress", { done, total: queue.length })}
            </p>
            <ul className="mt-2 space-y-2">
              {queue.map((item) => (
                <li key={item.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span className={item.stage === "failed" ? "text-red-700" : "text-ink/60"}>
                      {item.stage === "failed" ? t("failed") : t(item.stage)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className={`h-full ${item.stage === "failed" ? "bg-red-500" : "bg-brand"}`}
                      style={{ width: `${item.stage === "done" || item.stage === "processing" ? 100 : Math.round(item.progress * 100)}%` }}
                    />
                  </div>
                  {item.stage === "failed" ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-red-700">{item.error}</span>
                      <button type="button" onClick={() => void runQueue([item])} className="min-h-11 px-3 font-medium underline">
                        {t("retry")}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    );
  }

  if (view === "wish") {
    return (
      <section className={card}>
        {back}
        <h2 className="mt-2 font-serif text-2xl">{t("wish")}</h2>
        {consentBox}
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitWish(e.currentTarget);
          }}
        >
          <label className="block">
            <span className="text-sm font-medium">{t("wishLabel")}</span>
            <textarea
              name="message"
              required
              maxLength={1000}
              rows={5}
              placeholder={t("wishPlaceholder")}
              className="mt-1 block w-full rounded-xl border border-ink/20 p-4 text-lg"
            />
          </label>
          <button type="submit" disabled={busy || !consent} className={button}>
            {busy ? t("sending") : t("wishSubmit")}
          </button>
        </form>
        {errorBox}
      </section>
    );
  }

  // Menu
  const action = "flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-ink/10 bg-white text-lg font-medium shadow-sm";
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg">{t("hello", { name })}</p>
        <button type="button" onClick={() => setView("name")} className="min-h-11 text-sm text-ink/70 underline">
          {t("changeName")}
        </button>
      </div>
      <h2 className="mt-4 font-serif text-2xl">{t("chooseAction")}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" className={action} onClick={() => setView("photo")}>
          <span aria-hidden className="text-3xl">
            📷
          </span>
          {t("photo")}
        </button>
        {features.video ? null : (
            <button type="button" className={`${action} opacity-50`} disabled>
              <span aria-hidden className="text-3xl">
                🎥
              </span>
              {t("video")}
              <span className="text-xs font-normal">{t("comingSoon")}</span>
            </button>
        )}
        {features.voice ? null : (
            <button type="button" className={`${action} opacity-50`} disabled>
              <span aria-hidden className="text-3xl">
                🎙️
              </span>
              {t("voice")}
              <span className="text-xs font-normal">{t("comingSoon")}</span>
            </button>
        )}
        <button type="button" className={action} onClick={() => setView("wish")}>
          <span aria-hidden className="text-3xl">
            ✍️
          </span>
          {t("wish")}
        </button>
      </div>
      {galleryHref ? (
        <a href={galleryHref} className="mt-5 inline-flex min-h-11 items-center font-medium text-brand underline">
          {t("viewGallery")} →
        </a>
      ) : null}
    </section>
  );
}