import { PrismaClient } from "@prisma/client";

/** Fixture client for the local database; Prisma reads DATABASE_URL from .env. */
export const prisma = new PrismaClient();
