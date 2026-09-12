import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const root = process.cwd();
const dist = join(root, "dist");
const embedded = join(root, "embedded-assets.ts");
const executable = join(root, "HydraExporter.exe");

function readAsset(name: string): string {
  const path = join(dist, name);

  if (!existsSync(path)) {
    throw new Error(`Missing build asset: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function generateEmbeddedAssets(): void {
  const index = readAsset("index.html");
  const favicon = readAsset("favicon.svg");
  const icons = readAsset("icons.svg");

  const source = `
export const index = ${JSON.stringify(index)};
export const favicon = ${JSON.stringify(favicon)};
export const icons = ${JSON.stringify(icons)};
`;

  writeFileSync(embedded, source);
}

async function main(): Promise<void> {
  console.log("Building web application...");
  await $`tsc -b`;
  await $`vite build`;

  console.log("Embedding build assets...");
  generateEmbeddedAssets();

  console.log("Compiling executable...");

  await $`bun build ./start.ts --compile --outfile ${executable}`;

  console.log("Cleaning temporary files...");

  rmSync(embedded, {
    force: true,
  });

  rmSync(dist, {
    recursive: true,
    force: true,
  });

  console.log("");
  console.log(`Build complete: ${executable}`);
}

try {
  await main();
} catch (error) {
  console.error("");
  console.error("Build failed.");

  rmSync(embedded, {
    force: true,
  });

  process.exit(1);
}
