import { createMigrationClient, MigrationRunner } from "./migration-runner.js";
import { loadMigrations } from "./load-migrations.js";

async function runMigrations(): Promise<void> {
  const client = await createMigrationClient();

  try {
    const migrations = await loadMigrations();
    const runner = new MigrationRunner(client);

    await runner.run(migrations);
  } finally {
    await client.end();
  }
}

void runMigrations();
