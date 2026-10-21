// Secret the Playwright web server runs with (playwright.config.ts). A stale `next start` on 3100 started without it makes the cron tests 404.
export const CRON_SECRET = "e2e-cron-secret-0123456789";
