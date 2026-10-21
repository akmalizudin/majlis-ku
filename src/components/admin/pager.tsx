import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ADMIN_PAGE_SIZE } from "@/server/admin/service";
import { ghostButtonClass } from "./ui";

/** Previous and next links that keep the other query parameters. Renders nothing for a single page. */
export async function Pager({
  basePath,
  params = {},
  page,
  total,
}: {
  basePath: string;
  params?: Record<string, string | undefined>;
  page: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (pages === 1) return null;
  const t = await getTranslations("admin.pager");
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label={t("page", { page, pages })}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={ghostButtonClass}>
          ← {t("prev")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink/60">{t("page", { page, pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className={ghostButtonClass}>
          {t("next")} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
