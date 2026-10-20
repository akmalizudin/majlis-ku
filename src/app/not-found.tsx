import Link from "next/link";
import "./globals.css";

// Requests outside any locale (rare, the middleware adds one). Bilingual on purpose.
export default function GlobalNotFound() {
  return (
    <html lang="ms">
      <body className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Halaman tidak dijumpai · Page not found</h1>
          <p className="mt-4">
            <Link className="underline" href="/">
              Majlis Ku
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
