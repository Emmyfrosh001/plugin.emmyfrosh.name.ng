import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "plugins.json");

/* Make sure the data file exists before anything tries to read it. */
function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");
}

export function readAll() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(list) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), "utf8");
}

export function getById(id) {
  return readAll().find((p) => p.id === id) || null;
}

export function insert(plugin) {
  const list = readAll();
  list.unshift(plugin);
  writeAll(list);
  return plugin;
}

export function update(id, patch) {
  const list = readAll();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  writeAll(list);
  return list[idx];
}

export function remove(id) {
  const list = readAll();
  const next = list.filter((p) => p.id !== id);
  writeAll(next);
  return next.length !== list.length;
}
