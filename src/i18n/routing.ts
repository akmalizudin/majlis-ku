import { defineRouting } from "next-intl/routing";

// Bahasa Melayu is the default and has no URL prefix, so the QR link stays /{slug}.
// English lives under /en. No browser-language detection: guests see Malay unless they switch.
export const routing = defineRouting({
  locales: ["ms", "en"],
  defaultLocale: "ms",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
