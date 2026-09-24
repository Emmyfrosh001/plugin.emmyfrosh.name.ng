import crypto from "crypto";
import { getDb } from "./mongo.js";

function stripMongoId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

/* ════════════════════════════════════════════════════════════════
   PLUGINS
   ════════════════════════════════════════════════════════════════ */

async function pluginsCol() {
  const db = await getDb();
  return db.collection("plugins");
}

export async function readAll() {
  const col = await pluginsCol();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(stripMongoId);
}

export async function getById(id) {
  const col = await pluginsCol();
  const doc = await col.findOne({ id });
  return doc ? stripMongoId(doc) : null;
}

export async function insert(plugin) {
  const col = await pluginsCol();
  await col.insertOne(plugin);
  return plugin;
}

export async function update(id, patch) {
  const col = await pluginsCol();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ? stripMongoId(result) : null;
}

export async function remove(id) {
  const col = await pluginsCol();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

/* ════════════════════════════════════════════════════════════════
   USERS + SESSIONS
   ════════════════════════════════════════════════════════════════ */

async function usersCol() {
  const db = await getDb();
  return db.collection("users");
}
async function sessionsCol() {
  const db = await getDb();
  return db.collection("sessions");
}

export async function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const col = await usersCol();
  const doc = await col.findOne({ email: normalized });
  return doc ? stripMongoId(doc) : null;
}

export async function findUserByGithubId(githubId) {
  const col = await usersCol();
  const doc = await col.findOne({ githubId: String(githubId) });
  return doc ? stripMongoId(doc) : null;
}

export async function findUserById(id) {
  const col = await usersCol();
  const doc = await col.findOne({ id });
  return doc ? stripMongoId(doc) : null;
}

export async function createUser(user) {
  const col = await usersCol();
  await col.insertOne(user);
  return user;
}

export async function getAllUsers() {
  const col = await usersCol();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(stripMongoId);
}

export async function updateUser(id, patch) {
  const col = await usersCol();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ? stripMongoId(result) : null;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  const col = await sessionsCol();
  await col.insertOne({ token, userId, createdAt: new Date().toISOString() });
  return token;
}

export async function deleteSession(token) {
  if (!token) return;
  const col = await sessionsCol();
  await col.deleteOne({ token });
}

export async function findUserBySessionToken(token) {
  if (!token) return null;
  const col = await sessionsCol();
  const session = await col.findOne({ token });
  if (!session) return null;
  return findUserById(session.userId);
}

/* ════════════════════════════════════════════════════════════════
   ADMIN KEY OVERRIDE
   ════════════════════════════════════════════════════════════════ */

async function adminCol() {
  const db = await getDb();
  return db.collection("admin");
}

export async function getStoredAdminKey() {
  const col = await adminCol();
  const doc = await col.findOne({ _id: "singleton" });
  return doc ? doc.key : null;
}

export async function setStoredAdminKey(key) {
  const col = await adminCol();
  await col.updateOne(
    { _id: "singleton" },
    { $set: { key } },
    { upsert: true }
  );
  return key;
}
