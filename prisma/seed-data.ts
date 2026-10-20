// Reference data seeded into every database: plans and e-card templates.
// Admins can edit these later; the seed only creates missing rows and refreshes defaults.

import type { PlanCode } from "@prisma/client";

export const MB = 1024n * 1024n;
export const GB = 1024n * MB;

export type SeedPlan = {
  code: PlanCode;
  nameMs: string;
  nameEn: string;
  priceSen: number;
  includesGallery: boolean;
  includesEcard: boolean;
  uploadLimit: number | null;
  videoAllowed: boolean;
  maxVideoSeconds: number | null;
  maxUploadBytes: bigint;
  storageLimitBytes: bigint | null;
  retentionDays: number;
  sortOrder: number;
};

export const PLANS: SeedPlan[] = [
  {
    code: "FREE",
    nameMs: "Percuma",
    nameEn: "Free",
    priceSen: 0,
    includesGallery: true,
    includesEcard: false,
    uploadLimit: 100,
    videoAllowed: false,
    maxVideoSeconds: null,
    maxUploadBytes: 15n * MB,
    storageLimitBytes: 2n * GB,
    retentionDays: 30,
    sortOrder: 0,
  },
  {
    code: "ECARD",
    nameMs: "Kad Jemputan",
    nameEn: "E-card",
    priceSen: 4000,
    includesGallery: false,
    includesEcard: true,
    uploadLimit: 0,
    videoAllowed: false,
    maxVideoSeconds: null,
    maxUploadBytes: 15n * MB,
    storageLimitBytes: 200n * MB,
    retentionDays: 365,
    sortOrder: 1,
  },
  {
    code: "PREMIUM",
    nameMs: "Premium",
    nameEn: "Premium",
    priceSen: 12000,
    includesGallery: true,
    includesEcard: true,
    uploadLimit: null,
    videoAllowed: true,
    maxVideoSeconds: 60,
    maxUploadBytes: 200n * MB,
    storageLimitBytes: null,
    retentionDays: 365,
    sortOrder: 2,
  },
];

export type SeedTemplate = {
  code: string;
  nameMs: string;
  nameEn: string;
  defaults: {
    layout: "classic" | "modern" | "floral";
    font: "serif" | "sans";
    primary: string;
    background: string;
    accent: string;
  };
  premium: boolean;
  sortOrder: number;
};

export const TEMPLATES: SeedTemplate[] = [
  {
    code: "klasik-songket",
    nameMs: "Klasik Songket",
    nameEn: "Classic Songket",
    defaults: { layout: "classic", font: "serif", primary: "#7a1f2b", background: "#fbf3e4", accent: "#c9a227" },
    premium: false,
    sortOrder: 0,
  },
  {
    code: "moden-minimal",
    nameMs: "Moden Minimal",
    nameEn: "Modern Minimal",
    defaults: { layout: "modern", font: "sans", primary: "#1f2a37", background: "#ffffff", accent: "#8b5e3c" },
    premium: false,
    sortOrder: 1,
  },
  {
    code: "taman-bunga",
    nameMs: "Taman Bunga",
    nameEn: "Flower Garden",
    defaults: { layout: "floral", font: "serif", primary: "#3f6b4f", background: "#f6f1f4", accent: "#d48aa6" },
    premium: false,
    sortOrder: 2,
  },
];
