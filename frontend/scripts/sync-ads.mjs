import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "..", "data", "ads.txt");
const target = join(root, "src", "data", "ads.txt");

if (existsSync(source)) {
  copyFileSync(source, target);
}
