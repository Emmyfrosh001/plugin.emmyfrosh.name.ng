import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const SUGGESTIONS_FILE = path.join(DATA_DIR, "suggestions.json");

function ensureSuggestionsDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUGGESTIONS_FILE)) fs.writeFileSync(SUGGESTIONS_FILE, "[]", "utf8");
}

function readSuggestions() {
  ensureSuggestionsDb();
  try {
    return JSON.parse(fs.readFileSync(SUGGESTIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeSuggestions(list) {
  ensureSuggestionsDb();
  fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(list, null, 2), "utf8");
}

export async function insertSuggestion(suggestion) {
  const list = readSuggestions();
  list.unshift(suggestion);
  writeSuggestions(list);
  return suggestion;
}

export async function readAllSuggestions() {
  return readSuggestions();
}

export async function deleteSuggestion(id) {
  const list = readSuggestions();
  const next = list.filter((s) => s.id !== id);
  writeSuggestions(next);
  return next.length !== list.length;
}
