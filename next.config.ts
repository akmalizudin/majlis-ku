import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pdfkit reads its font metrics and ffmpeg-static points at its binary from their own folders; keep them out of the bundle.
  serverExternalPackages: ["pdfkit", "ffmpeg-static"],
};

export default withNextIntl(nextConfig);
