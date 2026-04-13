import { createPrismaClient, type AppPrismaClient } from "@/lib/prisma/prisma";
import { getCloudflareEnv } from "./cloudflare-context";

export function getDb(): AppPrismaClient {
  return createPrismaClient(getCloudflareEnv().DB);
}
