import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set — the app cannot connect to the database.");
}

let clientPromise;

function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  return client.db();
}
