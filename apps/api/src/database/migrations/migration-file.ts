export interface MigrationFile {
  readonly checksum: string;
  readonly name: string;
  readonly path: string;
  readonly sql: string;
  readonly version: string;
}
