import { getDb } from "./mongo.js";

function stripMongoId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

async function suggestionsCol() {
  const db = await getDb();
  return db.collection("suggestions");
}

export async function insertSuggestion(suggestion) {
  const col = await suggestionsCol();
  await col.insertOne(suggestion);
  return suggestion;
}

export async function readAllSuggestions() {
  const col = await suggestionsCol();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(stripMongoId);
}

export async function deleteSuggestion(id) {
  const col = await suggestionsCol();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}
