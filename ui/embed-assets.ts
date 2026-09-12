import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

const index = readFileSync(join(dist, "index.html"), "utf8");

const favicon = readFileSync(join(dist, "favicon.svg"), "utf8");

const icons = readFileSync(join(dist, "icons.svg"), "utf8");

const source = `
export const index = ${JSON.stringify(index)};
export const favicon = ${JSON.stringify(favicon)};
export const icons = ${JSON.stringify(icons)};
`;

writeFileSync(join(root, "embedded-assets.ts"), source);

console.log("Embedded assets generated.");
