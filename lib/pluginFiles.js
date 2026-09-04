import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PLUGINS_DIR = path.join(__dirname, "..", "plugins");

function ensureDir() {
  if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

/** id is always a crypto.randomUUID() value generated server-side, so it's
 *  safe to use directly in a filename — no user-controlled path segments. */
export function writePluginFile(id, code) {
  ensureDir();
  fs.writeFileSync(path.join(PLUGINS_DIR, `${id}.js`), code, "utf8");
}

export function deletePluginFile(id) {
  const file = path.join(PLUGINS_DIR, `${id}.js`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function readPluginFile(id) {
  const file = path.join(PLUGINS_DIR, `${id}.js`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}
