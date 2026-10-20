import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { EVENT_TIMEZONE } from "@/lib/dates";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    timeZone: EVENT_TIMEZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
