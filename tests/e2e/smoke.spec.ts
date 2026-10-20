import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("home page is in Malay by default and switches to English", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kenangan majlis anda, terkumpul di satu tempat");

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every memory of your event, in one place");
});

test("signed-out visit to the dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log masuk sebagai tuan rumah");
});

test("host signs in with a magic link; a host cannot open admin", async ({ page }) => {
  const email = `host-${Date.now()}@majlisku.test`;
  await signInAs(page, email);
  await expect(page.getByText(email)).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akses ditolak");
});

test("admin email can open the admin panel", async ({ page }) => {
  await signInAs(page, "admin@majlisku.test");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panel admin");
});

test("guest event page shows the demo event", async ({ page }) => {
  await page.goto("/demo-aisyah-daniel");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aisyah & Daniel");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
});
