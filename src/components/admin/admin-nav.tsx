"use client";

import { Link, usePathname } from "@/i18n/navigation";

export function AdminNav({ links, label }: { links: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1" aria-label={label}>
      {links.map((link) => {
        const active = link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium ${active ? "bg-ink text-white" : "bg-white text-ink/80 hover:bg-ink/5"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
