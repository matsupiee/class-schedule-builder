import { PrismaClient } from "@/generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

export function createPrismaClient(d1: D1Database) {
  return new PrismaClient({ adapter: new PrismaD1(d1) });
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;
