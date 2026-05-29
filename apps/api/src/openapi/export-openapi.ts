import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createOpenApiDocument } from "./create-openapi-document.js";

const outputPath = resolve(import.meta.dirname, "../../openapi.json");

async function exportOpenApi(): Promise<void> {
  const document = await createOpenApiDocument();
  const serializedDocument = JSON.stringify(document, null, 2);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${serializedDocument}\n`, "utf8");
}

void exportOpenApi();
