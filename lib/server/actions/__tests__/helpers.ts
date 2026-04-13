import fs from "node:fs";
import path from "node:path";
import { Miniflare } from "miniflare";
import { createPrismaClient } from "@/lib/prisma/prisma";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../prisma/migrations",
);

const DB_OBJECTS = [
  "ActualTimetableSlot",
  "SubjectUnit",
  "FixedTimetableSlot",
  "RequiredLessonCount",
  "CalendarDay",
  "WeeklyDayRule",
  "Term",
  "Subject",
];

let miniflare: Miniflare | undefined;
let d1Promise: Promise<D1Database> | undefined;

function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
}

function splitStatements(sql: string): string[] {
  return stripSqlComments(sql)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function initD1(): Promise<D1Database> {
  miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response(null); } }",
    d1Databases: { DB: ":memory:" },
  });
  const d1 = (await miniflare.getD1Database("DB")) as unknown as D1Database;
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    for (const stmt of splitStatements(sql)) {
      await d1.prepare(stmt).run();
    }
  }
  return d1;
}

export async function setupDb() {
  if (!d1Promise) d1Promise = initD1();
  const d1 = await d1Promise;
  for (const name of DB_OBJECTS) {
    await d1.prepare(`DELETE FROM "${name}"`).run();
  }
  return createPrismaClient(d1);
}

export async function teardownDb() {
  if (miniflare) {
    await miniflare.dispose();
    miniflare = undefined;
    d1Promise = undefined;
  }
}
