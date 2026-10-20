import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

const SLUG = "demo-aisyah-daniel"; // Premium plan: includes the e-card

test("host publishes the e-card; a guest RSVPs and changes it; the host sees and exports the list", async ({ browser }) => {
  const stamp = Date.now();
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const host = await hostContext.newPage();
  await signInAs(host, "demo.host@majlisku.test");
  await host.getByRole("link", { name: /Aisyah & Daniel/ }).first().click();
  await host.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/);
  const eventId = host.url().split("/").pop()!;

  // Build the card.
  await host.goto(`/dashboard/events/${eventId}/card`);
  await host.getByRole("button", { name: /Taman Bunga/ }).click();
  await host.getByLabel("Nota (pakaian, doa, dll.)").fill(`Tema pastel ${stamp}`);
  // Start from an empty programme (earlier runs may have saved rows).
  const times = host.getByLabel("Masa");
  while ((await times.count()) > 0) {
    await times.first().locator("xpath=..").getByRole("button", { name: "Buang" }).click();
  }
  await host.getByRole("button", { name: "+ Tambah baris" }).click();
  await host.getByLabel("Masa").fill("11:00");
  await host.getByLabel("Aktiviti").fill("Ketibaan tetamu");
  await host.getByLabel("Buka RSVP").check();
  await host.getByLabel("Maksimum pax setiap jawapan").fill("4");
  await host.getByLabel("Terbitkan kad").check();
  await host.getByRole("button", { name: "Simpan kad" }).click();
  await expect(host.getByRole("status")).toHaveText("Kad disimpan.");

  // A guest opens the card.
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const response = await guest.goto(`/i/${SLUG}`);
  expect(response?.status()).toBe(200);
  await expect(guest.getByRole("heading", { level: 1 })).toHaveText("Aisyah & Daniel");
  await expect(guest.getByText(`Tema pastel ${stamp}`)).toBeVisible();
  await expect(guest.getByText("Ketibaan tetamu")).toBeVisible();
  await expect(guest.getByTestId("countdown")).toBeVisible();
  await expect(guest.getByRole("link", { name: /Tambah ke kalendar/ })).toBeVisible();

  // Link preview tags for WhatsApp.
  const ogTitle = await guest.locator('meta[property="og:title"]').getAttribute("content");
  expect(ogTitle).toContain("Aisyah & Daniel");
  const ogImage = await guest.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(ogImage).toMatch(/^http:\/\/localhost:\d+\/.*opengraph-image/);
  const image = await guest.request.get(ogImage!);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  const ics = await guest.request.get(`/api/e/${SLUG}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("DTSTART:");

  // RSVP for 3, then change it to 2.
  const guestName = `Keluarga Rahman ${stamp}`;
  await guest.getByLabel("Nama", { exact: true }).fill(guestName);
  await guest.getByLabel("Bilangan pax (termasuk anda)").selectOption("3");
  await guest.getByLabel("Mesej untuk tuan rumah").fill("Tahniah!");
  await guest.getByRole("button", { name: "Hantar RSVP" }).click();
  await expect(guest.getByTestId("rsvp-done")).toContainText("3 pax");
  await guest.reload();
  await expect(guest.getByTestId("rsvp-done")).toBeVisible();
  await guest.getByRole("button", { name: "Ubah jawapan" }).click();
  await guest.getByLabel("Bilangan pax (termasuk anda)").selectOption("2");
  await guest.getByRole("button", { name: "Kemas kini RSVP" }).click();
  await expect(guest.getByTestId("rsvp-done")).toContainText("2 pax");

  // More than the limit is refused by the server.
  const tooMany = await guest.request.post(`/api/e/${SLUG}/rsvp`, { data: { name: "X", attending: true, pax: 9 } });
  expect(tooMany.status()).toBe(400);

  // Host: one reply for this guest, 2 pax.
  await host.goto(`/dashboard/events/${eventId}/rsvp`);
  const row = host.getByTestId("rsvp-table").locator("tr", { hasText: guestName });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("2");
  const csv = await host.request.get(`/api/events/${eventId}/rsvp/export?format=csv`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain(`${guestName},Ya,2`);
  const xlsx = await host.request.get(`/api/events/${eventId}/rsvp/export?format=xlsx`);
  expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK");

  await Promise.all([hostContext.close(), guestContext.close()]);
});

test("an event on the Free plan has no public card", async ({ page }) => {
  await signInAs(page, `free-${Date.now()}@majlisku.test`);
  await page.getByRole("link", { name: "+ Majlis baharu" }).click();
  await page.getByLabel("Tajuk majlis").fill("Hari Jadi");
  await page.getByLabel("Nama tuan rumah / pasangan").fill("Adik Comel");
  await page.getByRole("button", { name: "Cipta majlis" }).click();
  await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/);
  const slug = new URL((await page.getByTestId("event-url").textContent())!.trim()).pathname.slice(1);
  await page.getByRole("link", { name: "Kad jemputan" }).click();
  await expect(page.getByText("Kad jemputan tidak termasuk dalam pelan majlis ini.", { exact: false })).toBeVisible();
  const response = await page.goto(`/i/${slug}`);
  expect(response?.status()).toBe(404);
});