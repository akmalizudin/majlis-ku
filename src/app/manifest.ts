import type { MetadataRoute } from "next";
import { BRAND_COLOR, BRAND_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: "Buku tetamu digital & kad jemputan · Digital guestbook & e-invitations",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbf7f2",
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
