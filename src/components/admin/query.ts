import { z } from "zod";

// Query strings are user input: bad values fall back to the defaults instead of throwing.
const page = z.coerce.number().int().min(1).max(100_000).catch(1);
const q = z.string().trim().max(100).catch("");
const eventStatus = z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"]).optional().catch(undefined);
const planCode = z.enum(["FREE", "ECARD", "PREMIUM"]).optional().catch(undefined);

export const eventsQuery = z.object({ q, status: eventStatus, plan: planCode, page });
export const usersQuery = z.object({ q, page });
export const reportsQuery = z.object({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED", "ALL"]).catch("OPEN"), page });
export const pageQuery = z.object({ page });

export type RawQuery = Record<string, string | string[] | undefined>;
