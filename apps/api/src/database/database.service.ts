import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

import type { SqlValue } from "./database.types.js";
import { getDatabaseUrl } from "../shared/config/environment.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
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

  public async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
