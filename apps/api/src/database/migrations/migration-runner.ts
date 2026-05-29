import { Client } from "pg";

import { getDatabaseUrl } from "../../shared/config/environment.js";
import type { MigrationFile } from "./migration-file.js";

interface AppliedMigration {
  readonly checksum: string;
  readonly version: string;
}

export class MigrationRunner {
  public constructor(private readonly client: Client) {}

  public async run(migrations: readonly MigrationFile[]): Promise<void> {
    await this.client.query("BEGIN");

    try {
      await this.client.query(
        "SELECT pg_advisory_xact_lock(hashtext('smartsite_schema_migrations'))",
      );
      await this.createMigrationsTable();

      const appliedMigrations = await this.getAppliedMigrations();

      for (const migration of migrations) {
        await this.applyMigrationIfNeeded(migration, appliedMigrations);
      }

      await this.client.query("COMMIT");
    } catch (error) {
      await this.client.query("ROLLBACK");
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        name text NOT NULL,
        checksum text NOT NULL,
        executed_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  private async getAppliedMigrations(): Promise<Map<string, AppliedMigration>> {
    const result = await this.client.query<AppliedMigration>(
      "SELECT version, checksum FROM schema_migrations ORDER BY version",
    );

    return new Map(result.rows.map((migration) => [migration.version, migration]));
  }

  private async applyMigrationIfNeeded(
    migration: MigrationFile,
    appliedMigrations: ReadonlyMap<string, AppliedMigration>,
  ): Promise<void> {
    const appliedMigration = appliedMigrations.get(migration.version);

    if (appliedMigration) {
      this.assertChecksumMatches(migration, appliedMigration);
      return;
    }

    await this.client.query(migration.sql);
    await this.client.query(
      "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
      [migration.version, migration.name, migration.checksum],
    );

    console.log(`Applied migration ${migration.name}`);
  }

  private assertChecksumMatches(
    migration: MigrationFile,
    appliedMigration: AppliedMigration,
  ): void {
    if (appliedMigration.checksum !== migration.checksum) {
      throw new Error(`Migration checksum mismatch for ${migration.name}.`);
    }
  }
}

export async function createMigrationClient(): Promise<Client> {
  const client = new Client({
    connectionString: getDatabaseUrl(),
  });

  await client.connect();

  return client;
}
