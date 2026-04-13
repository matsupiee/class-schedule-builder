import { createPrismaClient, type AppPrismaClient } from "@packages/db";
import { getCloudflareEnv } from "./cloudflare-context";

export function getDb(): AppPrismaClient {
  return createPrismaClient(getCloudflareEnv().DB);
}
