import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

import type { MigrationFile } from "./migration-file.js";

const migrationsDirectory = resolve(import.meta.dirname, "../../../database/migrations");

export async function loadMigrations(): Promise<MigrationFile[]> {
  const fileNames = await readdir(migrationsDirectory);
  const sqlFileNames = fileNames.filter((fileName) => extname(fileName) === ".sql").sort();
  const migrations = await Promise.all(sqlFileNames.map(loadMigration));

  return migrations;
}

async function loadMigration(fileName: string): Promise<MigrationFile> {
  const path = resolve(migrationsDirectory, fileName);
  const sql = await readFile(path, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  return {
    checksum,
    name: basename(fileName, ".sql"),
    path,
    sql,
    version: fileName.split("_")[0] ?? fileName,
  };
}
