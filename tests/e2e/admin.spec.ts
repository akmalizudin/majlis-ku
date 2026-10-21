import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import sharp from "sharp";
import { createEventAs, signInAs } from "./helpers";

const ADMIN_EMAIL = "admin@majlisku.test";
const DESKTOP = { viewport: { width: 1280, height: 900 } };

/** A signed-in page in its own context (cookies are per context). */
async function signedIn(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(DESKTOP);
  const page = await context.newPage();
  await signInAs(page, email);
  return { context, page };
}

/** Admin forms are client components: wait for hydration, or a click would submit the form natively. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const saved = (page: Page) => page.getByRole("status").filter({ hasText: "Disimpan." });
const auditRow = (page: Page, slug: string, action: string) => page.getByRole("row").filter({ hasText: slug }).filter({ hasText: action });

async function setPlan(admin: Page, eventId: string, plan: string): Promise<void> {
  await open(admin, `/admin/events/${eventId}`);
  await admin.getByRole("combobox").selectOption({ label: plan });
  await admin.getByRole("button", { name: "Tukar pelan" }).click();
  await expect(saved(admin)).toBeVisible();
}

test("a host cannot open admin pages", async ({ browser }) => {
  const { context, page } = await signedIn(browser, `host-${Date.now()}-a@majlisku.test`);
  for (const path of ["/admin", "/admin/events", "/admin/plans", "/admin/reports", "/admin/templates", "/admin/users", "/admin/audit"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText("Akses ditolak");
  }
  await context.close();
});

test("admin changes an event's plan", async ({ browser }) => {
  const stamp = Date.now();
  const hostContext = await browser.newContext(DESKTOP);
  const host = await hostContext.newPage();
  const { eventId, slug } = await createEventAs(host, `host-${stamp}-b@majlisku.test`);
  await expect(host.getByText("Pelan: Percuma")).toBeVisible();

  const { context: adminContext, page: admin } = await signedIn(browser, ADMIN_EMAIL);
  await setPlan(admin, eventId, "Premium");

  await host.reload();
  await expect(host.getByText("Pelan: Premium")).toBeVisible();
  await open(admin, "/admin/audit");
  await expect(auditRow(admin, slug, "Pelan majlis ditukar")).toContainText("FREE → PREMIUM");
  await Promise.all([hostContext.close(), adminContext.close()]);
});

test("guest reports, admin suspends and unsuspends", async ({ browser }) => {
  const stamp = Date.now();
  const hostContext = await browser.newContext(DESKTOP);
  const host = await hostContext.newPage();
  const { eventId, slug } = await createEventAs(host, `host-${stamp}-c@majlisku.test`);
  const { context: adminContext, page: admin } = await signedIn(browser, ADMIN_EMAIL);

  // Premium with a published card, so the public card has something to close.
  await setPlan(admin, eventId, "Premium");
  await host.goto(`/dashboard/events/${eventId}/card`);
  await host.waitForLoadState("networkidle");
  await host.getByLabel("Terbitkan kad").check();
  await host.getByRole("button", { name: "Simpan kad" }).click();
  await expect(host.getByRole("status")).toHaveText("Kad disimpan.");

  // The report form works with JavaScript off.
  const guestContext = await browser.newContext({ javaScriptEnabled: false });
  const guest = await guestContext.newPage();
  expect((await guest.goto(`/i/${slug}`))?.status()).toBe(200);
  await guest.goto(`/${slug}/report`);
  await guest.getByLabel("Penipuan atau spam").check();
  await guest.getByLabel("Butiran (pilihan)").fill(`Pautan palsu ${stamp}`);
  await guest.getByRole("button", { name: "Hantar laporan" }).click();
  await expect(guest.getByRole("heading", { name: "Terima kasih" })).toBeVisible();

  // The admin sees it under open reports, then suspends.
  await open(admin, "/admin/reports");
  const reportRow = admin.getByRole("row").filter({ hasText: slug });
  await expect(reportRow).toContainText("Penipuan atau spam");
  await expect(reportRow).toContainText(`Pautan palsu ${stamp}`);
  await open(admin, `/admin/events/${eventId}`);
  await admin.getByRole("button", { name: "Gantung majlis" }).click();
  await expect(admin.getByRole("button", { name: "Pulihkan" })).toBeVisible();

  expect((await guest.goto(`/${slug}`))?.status()).toBe(404);
  expect((await guest.goto(`/i/${slug}`))?.status()).toBe(404);
  await host.goto(`/dashboard/events/${eventId}`);
  await expect(host.getByText("Majlis ini telah digantung oleh Majlis Ku. Tetamu tidak dapat membukanya.")).toBeVisible();

  // Unsuspend: the guest pages are back.
  await admin.getByRole("button", { name: "Pulihkan" }).click();
  await expect(admin.getByRole("button", { name: "Gantung majlis" })).toBeVisible();
  expect((await guest.goto(`/${slug}`))?.status()).toBe(200);
  expect((await guest.goto(`/i/${slug}`))?.status()).toBe(200);

  // Resolve the report; all three actions are in the audit log.
  await open(admin, `/admin/events/${eventId}`);
  await admin.getByRole("button", { name: "Selesaikan" }).click();
  await expect(admin.getByText("Tiada laporan terbuka.")).toBeVisible(); // the resolved report leaves the list
  await open(admin, "/admin/audit");
  await expect(auditRow(admin, slug, "Majlis digantung")).toHaveCount(1);
  await expect(auditRow(admin, slug, "Majlis dipulihkan")).toHaveCount(1);
  await expect(auditRow(admin, slug, "Laporan diselesaikan")).toHaveCount(1);
  await Promise.all([hostContext.close(), adminContext.close(), guestContext.close()]);
});

test("suspending closes a guest live stream", async ({ browser }) => {
  const hostContext = await browser.newContext(DESKTOP);
  const host = await hostContext.newPage();
  const { eventId, slug } = await createEventAs(host, `host-${Date.now()}-d@majlisku.test`);
  await host.goto(`/dashboard/events/${eventId}/edit`);
  await host.waitForLoadState("networkidle");
  await host.getByLabel("Semua tetamu yang ada pautan").check();
  await host.getByRole("button", { name: "Simpan tetapan" }).click();
  await expect(host.getByRole("status").first()).toHaveText("Disimpan");

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`/${slug}`);
  await guest.evaluate((path) => {
    const w = window as unknown as { __es: EventSource; __ready: boolean };
    w.__ready = false;
    w.__es = new EventSource(path);
    w.__es.addEventListener("ready", () => (w.__ready = true));
  }, `/api/e/${slug}/stream`);
  await guest.waitForFunction(() => (window as unknown as { __ready: boolean }).__ready);

  const { context: adminContext, page: admin } = await signedIn(browser, ADMIN_EMAIL);
  await open(admin, `/admin/events/${eventId}`);
  await admin.getByRole("button", { name: "Gantung majlis" }).click();
  await expect(admin.getByRole("button", { name: "Pulihkan" })).toBeVisible();

  // "closed" ends the stream; the browser's reconnect gets 404 and gives up (CLOSED = 2).
  await guest.waitForFunction(() => (window as unknown as { __es: EventSource }).__es.readyState === 2, null, { timeout: 10_000 });
  await Promise.all([hostContext.close(), adminContext.close(), guestContext.close()]);
});

test("admin is read-only on a host dashboard", async ({ browser }) => {
  const hostContext = await browser.newContext(DESKTOP);
  const host = await hostContext.newPage();
  const { eventId } = await createEventAs(host, `host-${Date.now()}-e@majlisku.test`);
  const { context: adminContext, page: admin } = await signedIn(browser, ADMIN_EMAIL);

  await admin.goto(`/dashboard/events/${eventId}`);
  await expect(admin.getByText("Anda melihat majlis ini sebagai admin.")).toBeVisible();
  expect((await admin.request.get(`/api/events/${eventId}/export/media`)).status()).toBe(403);
  expect((await admin.request.get(`/api/events/${eventId}/export/wishes`)).status()).toBe(403);
  const photo = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#d48aa6" } }).jpeg().toBuffer();
  const cover = await admin.request.post(`/api/events/${eventId}/cover`, { multipart: { file: { name: "c.jpg", mimeType: "image/jpeg", buffer: photo } } });
  expect(cover.status()).toBe(403);

  // The edit page shows no edit form, settings or delete form.
  await admin.goto(`/dashboard/events/${eventId}/edit`);
  await expect(admin.getByRole("heading", { name: "Ahli" }).or(admin.getByRole("heading", { level: 2 }).first())).toBeVisible();
  await expect(admin.getByLabel("Tajuk majlis")).toHaveCount(0);
  await expect(admin.getByRole("button", { name: "Simpan perubahan" })).toHaveCount(0);
  await expect(admin.getByRole("button", { name: "Simpan tetapan" })).toHaveCount(0);
  await expect(admin.getByRole("button", { name: "Padam majlis ini" })).toHaveCount(0);
  await Promise.all([hostContext.close(), adminContext.close()]);
});

test("plan edits are validated and audited", async ({ browser }) => {
  const { context, page: admin } = await signedIn(browser, ADMIN_EMAIL);
  await open(admin, "/admin/plans");
  const section = (code: string) => admin.locator("section").filter({ has: admin.getByRole("heading", { level: 2, name: code }) });

  // The Free plan must stay active.
  const free = section("FREE");
  await free.getByLabel("Aktif", { exact: true }).uncheck();
  await free.getByRole("button", { name: "Simpan pelan" }).click();
  await expect(free.getByRole("alert")).toContainText("Pelan Percuma mesti kekal aktif dan berharga RM 0.");

  // A valid edit saves and shows; always put the price back.
  await open(admin, "/admin/plans");
  const ecard = section("ECARD");
  const setPrice = async (price: string) => {
    await ecard.getByLabel("Harga (RM)").fill(price);
    await ecard.getByRole("button", { name: "Simpan pelan" }).click();
    await expect(ecard.getByRole("status")).toHaveText("Disimpan.");
  };
  try {
    await setPrice("45");
    await expect(ecard.getByText("RM 45.00")).toBeVisible();
    await open(admin, "/admin/audit");
    await expect(admin.getByRole("row").filter({ hasText: "Pelan dikemas kini" }).filter({ hasText: "ECARD" }).first()).toContainText("Harga");
  } finally {
    await open(admin, "/admin/plans");
    await setPrice("40");
    await expect(ecard.getByText("RM 40.00")).toBeVisible();
  }
  await context.close();
});

test("admin creates a template and deactivates it; it leaves the card builder", async ({ browser }) => {
  const stamp = Date.now();
  const code = `e2e-${stamp}`;
  const name = `E2E Templat ${stamp}`;
  const hostContext = await browser.newContext(DESKTOP);
  const host = await hostContext.newPage();
  const { eventId } = await createEventAs(host, `host-${stamp}-f@majlisku.test`);
  const { context: adminContext, page: admin } = await signedIn(browser, ADMIN_EMAIL);
  await setPlan(admin, eventId, "Premium"); // the e-card builder needs a plan with the e-card

  await open(admin, "/admin/templates");
  const create = admin.locator("section").filter({ has: admin.getByRole("heading", { name: "Templat baharu" }) });
  await create.getByLabel("Kod").fill(code);
  await create.getByLabel("Nama (Bahasa Melayu)").fill(name);
  await create.getByLabel("Nama (English)").fill(name);
  await create.getByRole("button", { name: "Cipta templat" }).click();
  await expect(create.getByRole("status")).toHaveText("Disimpan.");

  await host.goto(`/dashboard/events/${eventId}/card`);
  await host.waitForLoadState("networkidle");
  await host.getByRole("button", { name: new RegExp(name) }).click();
  await host.getByRole("button", { name: "Simpan kad" }).click();
  await expect(host.getByRole("status")).toHaveText("Kad disimpan.");

  await open(admin, "/admin/templates");
  const row = admin.getByRole("listitem").filter({ hasText: code });
  await row.getByText("Sunting").click();
  await row.getByLabel("Aktif", { exact: true }).uncheck();
  await row.getByRole("button", { name: "Simpan templat" }).click();
  await expect(row.getByRole("status")).toHaveText("Disimpan.");

  await host.goto(`/dashboard/events/${eventId}/card`);
  // The card that already uses it keeps it selected and can still save.
  await host.waitForLoadState("networkidle");
  await expect(host.getByRole("button", { name: new RegExp(name) })).toHaveAttribute("aria-pressed", "true");
  await host.getByRole("button", { name: "Simpan kad" }).click();
  await expect(host.getByRole("status")).toHaveText("Kad disimpan.");

  // Another event's builder does not offer it.
  const otherContext = await browser.newContext(DESKTOP);
  const other = await otherContext.newPage();
  const { eventId: otherId } = await createEventAs(other, `host-${stamp}-h@majlisku.test`);
  await setPlan(admin, otherId, "Premium");
  await other.goto(`/dashboard/events/${otherId}/card`);
  await expect(other.getByRole("button", { name: /Taman Bunga/ })).toBeVisible(); // the builder did load
  await expect(other.getByRole("button", { name: new RegExp(name) })).toHaveCount(0);
  await Promise.all([hostContext.close(), adminContext.close(), otherContext.close()]);
});

test("admin deletes an event", async ({ browser }) => {
  const hostContext = await browser.newContext(DESKTOP);
  const host = await hostContext.newPage();
  const { eventId, slug } = await createEventAs(host, `host-${Date.now()}-g@majlisku.test`);
  const { context: adminContext, page: admin } = await signedIn(browser, ADMIN_EMAIL);

  await open(admin, `/admin/events/${eventId}`);
  await admin.getByLabel("Taip slug untuk mengesahkan").fill("salah");
  await admin.getByRole("button", { name: "Padam majlis secara kekal" }).click();
  await expect(admin.getByRole("alert").filter({ hasText: "Slug" })).toContainText("Slug yang ditaip tidak sepadan.");
  expect((await host.goto(`/${slug}`))?.status()).toBe(200);

  await admin.getByLabel("Taip slug untuk mengesahkan").fill(slug);
  await admin.getByRole("button", { name: "Padam majlis secara kekal" }).click();
  await admin.waitForURL(/\/admin\/events$/);
  expect((await host.goto(`/${slug}`))?.status()).toBe(404);
  await open(admin, "/admin/audit");
  await expect(auditRow(admin, slug, "Majlis dipadam")).toHaveCount(1);
  await Promise.all([hostContext.close(), adminContext.close()]);
});
