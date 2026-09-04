import { MongoClient } from "mongodb";

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
