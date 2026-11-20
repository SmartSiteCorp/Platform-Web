import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

import type { DatabaseExecutor, SqlValue } from "./database.types.js";
import { getDatabaseUrl } from "../shared/config/environment.js";

@Injectable()
export class DatabaseService implements DatabaseExecutor, OnModuleDestroy {
  private readonly pool: Pool;

  public constructor() {
    this.pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
    });
  }

  public async query<Row extends QueryResultRow>(
    text: string,
    values: readonly SqlValue[] = [],
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, [...values]);
  }

  public async withTransaction<Result>(
    handler: (transaction: DatabaseExecutor) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    const transaction: DatabaseExecutor = {
      query: async <Row extends QueryResultRow = QueryResultRow>(
        text: string,
        values: readonly SqlValue[] = [],
      ): Promise<QueryResult<Row>> => client.query<Row>(text, [...values]),
    };

    try {
      await client.query("BEGIN");

      const result = await handler(transaction);

      await client.query("COMMIT");

      return result;
    } catch (error) {
      await client.query("ROLLBACK");

      throw error;
    } finally {
      client.release();
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
