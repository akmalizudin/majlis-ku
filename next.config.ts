import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pdfkit reads its font metrics from its own folder at runtime; keep it out of the bundle.
  serverExternalPackages: ["pdfkit"],
};

export default withNextIntl(nextConfig);
