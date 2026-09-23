import fs from "fs";
import path from "path";
import crypto from "crypto";
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

/* ════════════════════════════════════════════════════════════════
   USERS + SESSIONS
   Separate JSON files (data/users.json, data/sessions.json), same
   read/write pattern as the plugin storage above. Function names here
   match exactly what routes/auth.js and lib/userAuth.js import.
   ════════════════════════════════════════════════════════════════ */

const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureUsersDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
}
function ensureSessionsDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, "[]", "utf8");
}

function readUsers() {
  ensureUsersDb();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function writeUsers(list) {
  ensureUsersDb();
  fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf8");
}
function readSessions() {
  ensureSessionsDb();
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function writeSessions(list) {
  ensureSessionsDb();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), "utf8");
}

export async function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return readUsers().find((u) => String(u.email || "").toLowerCase() === normalized) || null;
}

export async function findUserByGithubId(githubId) {
  return readUsers().find((u) => u.githubId && String(u.githubId) === String(githubId)) || null;
}

export async function findUserById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

export async function createUser(user) {
  const list = readUsers();
  list.unshift(user);
  writeUsers(list);
  return user;
}

export async function getAllUsers() {
  return readUsers();
}

export async function updateUser(id, patch) {
  const list = readUsers();
  const idx = list.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  writeUsers(list);
  return list[idx];
}

/* Sessions: token -> userId. createSession returns the new token. */
export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  const sessions = readSessions();
  sessions.push({ token, userId, createdAt: new Date().toISOString() });
  writeSessions(sessions);
  return token;
}

export async function deleteSession(token) {
  if (!token) return;
  const sessions = readSessions().filter((s) => s.token !== token);
  writeSessions(sessions);
}

export async function findUserBySessionToken(token) {
  if (!token) return null;
  const session = readSessions().find((s) => s.token === token);
  if (!session) return null;
  return findUserById(session.userId);
}
