import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const migrationName = process.argv[2];

if (!migrationName) {
  throw new Error("Usage: npm run db:migration:create -w apps/api -- <migration-name>");
}

const normalizedName = migrationName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");

if (!normalizedName) {
  throw new Error("Migration name must contain at least one letter or number.");
}

const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);
const migrationsDir = resolve(import.meta.dirname, "../database/migrations");
const migrationPath = resolve(migrationsDir, `${timestamp}_${normalizedName}.sql`);

await mkdir(migrationsDir, { recursive: true });
await writeFile(migrationPath, "-- Write migration SQL here.\n", { flag: "wx" });

console.log(`Created migration: ${migrationPath}`);
