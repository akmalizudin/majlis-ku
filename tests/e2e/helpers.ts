import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "@playwright/test";

const MAIL_LOG = join(process.cwd(), ".data", "dev-mail.log");

/** The newest development sign-in link sent to `email` (the app writes them to .data/dev-mail.log). */
export async function latestSignInLink(email: string, after: Date): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const text = await readFile(MAIL_LOG, "utf8").catch(() => "");
    const entry = text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { to: string; url: string; at: string })
      .filter((e) => e.to === email && new Date(e.at) >= after)
      .at(-1);
    if (entry) return entry.url;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No sign-in link for ${email}`);
}

/** Sign in as a host through the real magic-link flow. */
export async function signInAs(page: Page, email: string): Promise<void> {
  const started = new Date(Date.now() - 1000);
  await page.goto("/signin");
  await page.getByLabel("E-mel").fill(email);
  await page.getByRole("button", { name: "Hantar pautan log masuk" }).click();
  await page.waitForURL(/check-email/);
  await page.goto(await latestSignInLink(email, started));
  await page.waitForURL(/dashboard/);
}