import { MongoClient } from "mongodb";
import crypto from "crypto";

/**
 * Permanent storage layer.
 *
 * IMPORTANT: this now uses MongoDB instead of a local JSON file.
 * A local file lives on the server's disk, which most hosts wipe on
 * every restart / redeploy / sleep cycle — that's why accepted plugins
 * were disappearing. MongoDB is a separate, always-on database, so your
 * data survives restarts, redeploys, and even moving to a brand new
 * server, as long as you keep using the same MONGODB_URI.
 *
 * Set MONGODB_URI in your .env (see .env.example). A free MongoDB Atlas
 * cluster (https://www.mongodb.com/cloud/atlas/register) works fine.
 */

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "plugin_hub";

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Add it to your .env file (see .env.example)."
  );
}

let client;
let collectionPromise;

function getCollection() {
  if (!collectionPromise) {
    client = new MongoClient(MONGODB_URI);
    collectionPromise = client
      .connect()
      .then((c) => {
        console.log("✅ Connected to MongoDB — plugin data is now permanent.");
        return c.db(DB_NAME).collection("plugins");
      })
      .catch((err) => {
        collectionPromise = null; // allow retry on next call
        throw err;
      });
  }
  return collectionPromise;
}

/** Call this once at startup so the app fails fast if the DB is unreachable. */
export async function connectDb() {
  await getCollection();
}

export async function readAll() {
  const col = await getCollection();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(stripMongoId);
}

export async function getById(id) {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  return doc ? stripMongoId(doc) : null;
}

export async function insert(plugin) {
  const col = await getCollection();
  await col.insertOne(plugin);
  return plugin;
}

export async function update(id, patch) {
  const col = await getCollection();
  const result = await col.findOneAndUpdate(
    { id },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result ? stripMongoId(result) : null;
}

export async function remove(id) {
  const col = await getCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

function stripMongoId(doc) {
  const { _id, ...rest } = doc;
  return rest;
}

/* ── Admin settings (currently just the admin key) ───────────────
   Stored in its own collection so the password can change at runtime
   without needing a redeploy. Falls back to the ADMIN_KEY env var
   until an admin sets a new one from the Settings page. */
let settingsCollectionPromise;
function getSettingsCollection() {
  if (!settingsCollectionPromise) {
    if (!client) throw new Error("DB not connected yet.");
    settingsCollectionPromise = Promise.resolve(client.db(DB_NAME).collection("settings"));
  }
  return settingsCollectionPromise;
}

export async function getStoredAdminKey() {
  const col = await getSettingsCollection();
  const doc = await col.findOne({ _id: "admin" });
  return doc ? doc.adminKey : null;
}

export async function setStoredAdminKey(newKey) {
  const col = await getSettingsCollection();
  await col.updateOne(
    { _id: "admin" },
    { $set: { adminKey: newKey, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

/* ── Suggestions (public "Suggestion" form on the plugin desk) ──── */
let suggestionsCollectionPromise;
function getSuggestionsCollection() {
  if (!suggestionsCollectionPromise) {
    if (!client) throw new Error("DB not connected yet.");
    suggestionsCollectionPromise = Promise.resolve(client.db(DB_NAME).collection("suggestions"));
  }
  return suggestionsCollectionPromise;
}

export async function insertSuggestion(suggestion) {
  const col = await getSuggestionsCollection();
  await col.insertOne(suggestion);
  return suggestion;
}

export async function readAllSuggestions() {
  const col = await getSuggestionsCollection();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(stripMongoId);
}

export async function deleteSuggestion(id) {
  const col = await getSuggestionsCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

/* ── Users + sessions (login required before submitting a plugin) ─
   Two collections:
     users    — one doc per person, either via email+password or GitHub
     sessions — one doc per logged-in device, holds a random token that
                maps back to a userId, so we don't need JWTs or extra deps */
function getUsersCollection() {
  if (!client) throw new Error("DB not connected yet.");
  return Promise.resolve(client.db(DB_NAME).collection("users"));
}
function getSessionsCollection() {
  if (!client) throw new Error("DB not connected yet.");
  return Promise.resolve(client.db(DB_NAME).collection("sessions"));
}

export async function findUserByEmail(email) {
  const col = await getUsersCollection();
  const doc = await col.findOne({ email: String(email).toLowerCase() });
  return doc ? stripMongoId(doc) : null;
}

export async function findUserByGithubId(githubId) {
  const col = await getUsersCollection();
  const doc = await col.findOne({ githubId });
  return doc ? stripMongoId(doc) : null;
}

export async function findUserById(id) {
  const col = await getUsersCollection();
  const doc = await col.findOne({ id });
  return doc ? stripMongoId(doc) : null;
}

export async function createUser(user) {
  const col = await getUsersCollection();
  await col.insertOne(user);
  return stripMongoId(user);
}

export async function createSession(userId) {
  const col = await getSessionsCollection();
  const token = crypto.randomBytes(32).toString("hex");
  await col.insertOne({
    token,
    userId,
    createdAt: new Date().toISOString(),
    // Sessions last 30 days — long enough that people aren't asked to
    // log in constantly, short enough that a leaked token expires.
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return token;
}

export async function getUserBySessionToken(token) {
  if (!token) return null;
  const sessionsCol = await getSessionsCollection();
  const session = await sessionsCol.findOne({ token });
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    await sessionsCol.deleteOne({ token });
    return null;
  }
  return findUserById(session.userId);
}

export async function deleteSession(token) {
  const col = await getSessionsCollection();
  await col.deleteOne({ token });
}
