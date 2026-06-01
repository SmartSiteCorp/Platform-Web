import type { QueryResult, QueryResultRow } from "pg";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type SqlValue = JsonValue | Date | Buffer;

export interface DatabaseExecutor {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly SqlValue[],
  ): Promise<QueryResult<Row>>;
}
