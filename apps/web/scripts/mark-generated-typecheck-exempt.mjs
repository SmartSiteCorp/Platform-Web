import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const generatedApiDirectory = fileURLToPath(new URL("../src/generated/api", import.meta.url));
const typecheckDirective = "// @ts-nocheck\n";

async function collectTypescriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectTypescriptFiles(entryPath);
      }

      return Promise.resolve(extname(entry.name) === ".ts" ? [entryPath] : []);
    }),
  );

  return files.flat();
}

async function markFile(filePath) {
  const content = await readFile(filePath, "utf8");

  if (content.startsWith(typecheckDirective)) {
    return;
  }

  await writeFile(filePath, `${typecheckDirective}${content}`, "utf8");
}

const files = await collectTypescriptFiles(generatedApiDirectory);

await Promise.all(files.map((filePath) => markFile(filePath)));
