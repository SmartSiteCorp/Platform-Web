import { Injectable, Logger } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { StoragePort } from "./documents.types.js";

@Injectable()
export class DocumentsStorage implements StoragePort {
  private readonly logger = new Logger(DocumentsStorage.name);
  // Répertoire de base configurable via UPLOADS_PATH (placeholder local avant migration cloud).
  private readonly uploadsPath: string;

  public constructor() {
    this.uploadsPath = process.env.UPLOADS_PATH ?? "./uploads";
  }

  public async save(blobPath: string, buffer: Buffer): Promise<void> {
    const fullPath = join(this.uploadsPath, blobPath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    this.logger.log({ blobPath, event: "document.file.saved", sizeBytes: buffer.length });
  }

  public async read(blobPath: string): Promise<Buffer> {
    const fullPath = join(this.uploadsPath, blobPath);
    return readFile(fullPath);
  }
}
